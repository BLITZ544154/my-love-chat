require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json());

// 1. Database Connection
// .env ထဲမှာ MONGO_URI မရှိရင် local ကို သုံးမယ်
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/my_app_db';
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB ချိတ်ဆက်မှု အောင်မြင်သည်!"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. User Schema & Model (ဒေတာ သိမ်းမယ့် ပုံစံ)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// 3. Register Route (အကောင့်သစ်ဖွင့်ရန်)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Password ကို Hash လုပ်မယ် (လုံခြုံရေးအတွက်)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        
        res.status(201).json({ message: "User Register အောင်မြင်ပါတယ် သာကြီး!" });
    } catch (error) {
        res.status(500).json({ error: "Register လုပ်လို့မရပါ (Email တူနေတာ ဖြစ်နိုင်တယ်)" });
    }
});

// 4. Login Route (အကောင့်ဝင်ရန်)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ error: "User ရှာမတွေ့ပါ" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Password မှားနေတယ် သာကြီး" });

        // JWT Token ထုတ်ပေးမယ်
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
        
        res.json({ message: "Login အောင်မြင်တယ်!", token, user: { username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Socket.io Real-time Connection
io.on('connection', (socket) => {
    console.log(`⚡ User တစ်ယောက် ချိတ်လာပြီ: ${socket.id}`);
    
    socket.on('send_message', (data) => {
        io.emit('receive_message', data); // အားလုံးဆီ စာပြန်ပို့မယ်
    });

    socket.on('disconnect', () => {
        console.log("🔥 User ထွက်သွားပြီ");
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server က http://localhost:${PORT} မှာ အလုပ်လုပ်နေပြီ`);
});