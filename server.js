require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const server = http.createServer(app);

// Render / proxies အတွက် trust proxy သတ်မှတ်ထားမယ် (express-rate-limit အတွက်လို)
app.set('trust proxy', 1);

// Socket.io Setup
const io = new Server(server, {
    cors: { origin: "*" }
});

// Static & security middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
            "script-src-attr": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "res.cloudinary.com"],
        },
    },
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Environment & security ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    throw new Error("MONGODB_URI is required");
}

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
if (!CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is required");
}

cloudinary.config({
    secure: true
});

// Rate limiters (production hardening)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
});

const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

// 1. Database Connection + old index cleanup
mongoose.connection.on('connected', async () => {
    try {
        await mongoose.connection.db.collection('users').dropIndex('email_1');
        console.log('✅ Old email index dropped');
    } catch (e) {
        console.log('Index already gone or error dropping index');
    }
});

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB ချိတ်ဆက်မှု အောင်မြင်သည်!"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. Schemas & Models
// User Schema (phone ကို main identity အဖြစ် သုံးမယ်)
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String },
    wallet: {
        balance: { type: Number, default: 0 }
    },
    isVerified: { type: Boolean, default: false },
    settings: {
        notiSound: { type: Boolean, default: true },
        privacy: {
            showNumber: { type: Boolean, default: true }
        }
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Message Schema (per conversation, scalable index)
const messageSchema = new mongoose.Schema({
    conversationId: { type: String, index: true },
    senderPhone: { type: String, required: true, index: true },
    receiverPhone: { type: String, required: true, index: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['text', 'audio'], default: 'text' }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

// Helper: stable conversation id for two phones
function getConversationId(a, b) {
    return [a, b].sort().join(':');
}

// Helper: upload base64 data URL to Cloudinary and return secure URL
async function uploadBase64ToCloudinary(dataUrl, options) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            dataUrl,
            options,
            (error, result) => {
                if (error) return reject(error);
                return resolve(result.secure_url);
            }
        );
    });
}

// --- Auth middleware ---
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.id, phone: payload.phone };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// 3. Auth Routes (phone-based, frontend တွေနဲ့ ကိုက်ညီအောင်)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, password, name } = req.body;
        if (!phone || !password || !name) {
            return res.status(400).json({ success: false, error: "Phone, name, password လိုအပ်ပါတယ်" });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: "Password အနည်းဆုံး 6 လုံး လိုအပ်ပါတယ်" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existing = await User.findOne({ phone });
        if (existing) {
            // Phone ရှိပြီးသားဆိုရင် password + name ကို update လုပ်ပေးမယ် (reset account အနေနဲ့)
            existing.name = name;
            existing.password = hashedPassword;
            await existing.save();

            return res.status(200).json({
                success: true,
                message: "Account ကို အသစ် password နဲ့ update လုပ်ပြီးပါပြီ (reset success)"
            });
        }

        const user = new User({
            phone,
            name,
            password: hashedPassword
        });
        await user.save();

        return res.status(201).json({ success: true, message: "Account ဖန်တီးပြီးပါပြီ" });
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ success: false, error: "Register လုပ်လို့မရပါ" });
    }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        console.log("[AUTH] Login attempt", { phone });

        if (!phone || !password) {
            console.warn("[AUTH] Login failed: missing phone or password", { phone });
            return res.status(400).json({ success: false, error: "Phone, password လိုအပ်ပါတယ်" });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            console.warn("[AUTH] Login failed: user not found", { phone });
            return res.status(404).json({ success: false, error: "User ရှာမတွေ့ပါ" });
        }

        if (typeof user.password !== 'string') {
            console.error("[AUTH] Login failed: user has no valid password field", { phone, userId: user._id });
            return res.status(500).json({
                success: false,
                error: "ဒီ account ကို ဟောင်း version နဲ့ ဖန်တီးထားလို့ Login မလုပ်နိုင်သေးဘူး. Phone အသစ်နဲ့ Register လုပ်ပေးပါ."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn("[AUTH] Login failed: password mismatch", { phone });
            return res.status(400).json({ success: false, error: "Password မှားနေတယ်" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), phone: user.phone },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log("[AUTH] Login success", { phone });

        return res.json({
            success: true,
            token,
            user: {
                phone: user.phone,
                name: user.name
            }
        });
    } catch (error) {
        console.error("[AUTH] Login unexpected error:", error);
        return res.status(500).json({ success: false, error: "Login လုပ်လို့မရပါ" });
    }
});

// 4. User Profile APIs
app.get('/api/user/:phone', requireAuth, async (req, res) => {
    try {
        const user = await User.findOne({ phone: req.params.phone }).lean();
        if (!user) {
            return res.status(404).json(null);
        }
        return res.json({
            phone: user.phone,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            wallet: user.wallet,
            isVerified: user.isVerified
        });
    } catch (error) {
        console.error("Get User Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/user/update', requireAuth, async (req, res) => {
    try {
        const { name, bio, avatar } = req.body;
        const phoneFromToken = req.user.phone;

        const updateDoc = { name, bio };

        if (avatar) {
            let avatarToSave = avatar;
            if (typeof avatar === 'string' && avatar.startsWith('data:')) {
                avatarToSave = await uploadBase64ToCloudinary(avatar, {
                    folder: 'zspace/avatars',
                    resource_type: 'image'
                });
            }
            updateDoc.avatar = avatarToSave;
        }

        const updated = await User.findOneAndUpdate(
            { phone: phoneFromToken },
            { $set: updateDoc },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ error: "User မတွေ့ပါ" });
        }

        return res.json({
            success: true,
            user: {
                phone: updated.phone,
                name: updated.name,
                avatar: updated.avatar,
                bio: updated.bio
            }
        });
    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({ success: false, error: "Update လုပ်လို့မရပါ" });
    }
});

// 5. Messaging APIs (optimized basic version + pagination)
app.get('/api/messages/:me/:peer', requireAuth, async (req, res) => {
    try {
        const { me, peer } = req.params;
        if (req.user.phone !== me) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const conversationId = getConversationId(me, peer);

        const { limit = 50, before } = req.query;
        const numericLimit = Math.min(parseInt(limit, 10) || 50, 100);

        const query = { conversationId };
        if (before) {
            const beforeDate = new Date(before);
            if (!isNaN(beforeDate.getTime())) {
                query.createdAt = { $lt: beforeDate };
            }
        }

        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(numericLimit)
            .lean();

        // client wants oldest -> newest
        messages = messages.reverse();

        return res.json(
            messages.map(m => ({
                sender: m.senderPhone,
                receiver: m.receiverPhone,
                text: m.text,
                type: m.type,
                createdAt: m.createdAt
            }))
        );
    } catch (error) {
        console.error("Get Messages Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/send', sendLimiter, requireAuth, async (req, res) => {
    try {
        const senderPhone = req.user.phone;
        const { receiver, text } = req.body || {};

        if (!receiver || !text) {
            return res.status(400).json({ error: "receiver, text လိုအပ်ပါတယ်" });
        }

        let type = 'text';
        let storedText = text;

        if (String(text).startsWith('data:audio')) {
            type = 'audio';
            storedText = await uploadBase64ToCloudinary(text, {
                folder: 'zspace/voice',
                resource_type: 'video'
            });
        }

        const conversationId = getConversationId(senderPhone, receiver);

        const msg = await Message.create({
            conversationId,
            senderPhone,
            receiverPhone: receiver,
            text: storedText,
            type
        });

        const payload = {
            sender: msg.senderPhone,
            receiver: msg.receiverPhone,
            text: msg.text,
            type: msg.type,
            createdAt: msg.createdAt
        };

        // Emit only to sender & receiver private rooms
        io.to(senderPhone).to(receiver).emit('new-message', payload);

        return res.status(201).json({ success: true, message: payload });
    } catch (error) {
        console.error("Send Message Error:", error);
        return res.status(500).json({ success: false, error: "Message မပို့နိုင်ပါ" });
    }
});

// 6. Socket.io Real-time Connection with JWT auth & private rooms
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }
        const payload = jwt.verify(token, JWT_SECRET);
        socket.user = { id: payload.id, phone: payload.phone };
        return next();
    } catch (err) {
        return next(new Error('Unauthorized'));
    }
});

io.on('connection', (socket) => {
    const userPhone = socket.user && socket.user.phone;
    if (userPhone) {
        socket.join(userPhone);
        console.log(`⚡ User ${userPhone} connected with socket ${socket.id}`);
    } else {
        console.log(`⚡ Unidentified socket connected: ${socket.id}`);
    }

    socket.on('disconnect', () => {
        console.log("🔥 User ထွက်သွားပြီ");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});