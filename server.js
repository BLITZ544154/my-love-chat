const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Database Connection
const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/blitzApp?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("GLOW Z-SPACE Live! 🚀"));

const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    password: String,
    profilePic: { type: String, default: '' },
    bio: { type: String, default: 'Welcome to GLOW Z-SPACE' },
    points: { type: Number, default: 500 },
    badges: { type: Array, default: [] },
    privacy: { hidePhone: { type: Boolean, default: false } }
}));

// Payment Request Schema (For Kpay)
const Payment = mongoose.model('Payment', new mongoose.Schema({
    userId: String,
    amount: String,
    screenshot: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

io.on('connection', (socket) => {
    // Auth logic (Login/Register)
    socket.on('login_user', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else { socket.emit('error_msg', "Login Failed!"); }
    });

    // Profile & Image Update
    socket.on('update_profile', async (data) => {
        const updated = await User.findOneAndUpdate(
            { phone: data.phone },
            { profilePic: data.profilePic, bio: data.bio, "privacy.hidePhone": data.hidePhone },
            { new: true }
        );
        socket.emit('update_success', updated);
    });

    // Mission Completion Points
    socket.on('complete_mission', async (data) => {
        const user = await User.findOneAndUpdate({ phone: data.phone }, { $inc: { points: data.rewardPoints } }, { new: true });
        socket.emit('update_success', user);
    });

    // Kpay Payment Submission
    socket.on('submit_payment', async (data) => {
        const newPayment = new Payment(data);
        await newPayment.save();
        socket.emit('payment_submitted', "ငွေလွှဲမှုကို စစ်ဆေးပြီး Point ထည့်ပေးပါမည်။");
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));