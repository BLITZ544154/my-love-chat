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

app.set('trust proxy', 1);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
            "script-src-attr": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "res.cloudinary.com"],
            "connect-src": ["'self'", "https://res.cloudinary.com", "wss://my-love-chat.onrender.com"],
        },
    },
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGODB_URI;
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

cloudinary.config({ secure: true });

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB ချိတ်ဆက်မှု အောင်မြင်သည်!"))
    .catch(err => console.error("❌ DB Error:", err));

// --- Models ---
const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String },
    wallet: { balance: { type: Number, default: 0 } },
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, index: true },
    senderPhone: { type: String, required: true },
    receiverPhone: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['text', 'audio'], default: 'text' },
    isSeen: { type: Boolean, default: false } // Seen feature အတွက် ထည့်ထားသည်
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

function getConversationId(a, b) { return [a, b].sort().join(':'); }

async function uploadBase64ToCloudinary(dataUrl, folder) {
    const result = await cloudinary.uploader.upload(dataUrl, { folder, resource_type: 'auto' });
    return result.secure_url;
}

// --- Auth Middleware ---
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
}

// --- Routes ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({ phone }, { name, password: hashedPassword }, { upsert: true });
        res.status(201).json({ success: true, message: "Success" });
    } catch (e) { res.status(500).json({ error: "Register failed" }); }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: { name: user.name, phone: user.phone } });
    } catch (e) { res.status(500).json({ error: "Login failed" }); }
});

app.post('/api/send', sendLimiter, requireAuth, async (req, res) => {
    try {
        const { receiver, text, type = 'text' } = req.body;
        const senderPhone = req.user.phone;
        let finalPath = text;
        if (type === 'audio') {
            finalPath = await uploadBase64ToCloudinary(text, 'zspace/voice');
        }
        const msg = await Message.create({
            conversationId: getConversationId(senderPhone, receiver),
            senderPhone, receiverPhone: receiver, text: finalPath, type
        });
        io.to(receiver).to(senderPhone).emit('new-message', msg);
        res.status(201).json({ success: true, message: msg });
    } catch (e) { res.status(500).json({ error: "Send failed" }); }
});

// Frontend Routes
app.get(['/dashboard', '/messages', '/settings', '/edit-profile', '/call'], (req, res) => {
    const page = req.path.split('/')[1];
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('.')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Socket.io Logic (The "Magic" Part) ---
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
        socket.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) { next(new Error('Auth error')); }
});

io.on('connection', (socket) => {
    const myPhone = socket.user.phone;
    socket.join(myPhone);
    console.log(`⚡ ${myPhone} connected`);

    // Typing...
    socket.on('typing', (data) => {
        socket.to(data.receiver).emit('is_typing', { sender: myPhone });
    });

    // Seen Status
    socket.on('mark_seen', async (data) => {
        await Message.updateMany({ conversationId: getConversationId(myPhone, data.sender), receiverPhone: myPhone }, { isSeen: true });
        socket.to(data.sender).emit('messages_read', { by: myPhone });
    });

    // Call Signaling
    socket.on('call_request', (data) => {
        socket.to(data.to).emit('incoming_call', { from: myPhone, signal: data.signal });
    });

    socket.on('call_response', (data) => {
        socket.to(data.to).emit('call_finalized', { signal: data.signal, accepted: data.accepted });
    });

    socket.on('disconnect', () => console.log("🔥 Disconnected"));
});

server.listen(process.env.PORT || 3000);