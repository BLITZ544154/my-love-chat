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
mongoose.connect(mongoURI).then(() => console.log("GLOW Z-SPACE Database Connected! 🚀"));

const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, unique: true },
    email: String,
    password: String,
    name: String,
    profilePic: { type: String, default: '' },
    bio: { type: String, default: 'Welcome to my space! ✨' },
    points: { type: Number, default: 1000 },
    badges: { type: Array, default: [] },
    privacy: {
        hidePhone: { type: Boolean, default: false },
        hideName: { type: Boolean, default: false }
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    // Register & Login
    socket.on('register_user', async (data) => {
        try {
            const hash = await bcrypt.hash(data.password, 10);
            const newUser = new User({ ...data, password: hash });
            await newUser.save();
            socket.emit('register_success');
        } catch (err) { socket.emit('error_msg', "Error: အကောင့်ဖွင့်မရပါ။"); }
    });

    socket.on('login_user', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else { socket.emit('error_msg', "အချက်အလက်မှားနေပါသည်။"); }
    });

    // Profile Update (ပုံတင်ခြင်းနှင့် Privacy ပြင်ခြင်း)
    socket.on('update_profile', async (data) => {
        try {
            const updatedUser = await User.findOneAndUpdate(
                { phone: data.phone },
                { 
                    profilePic: data.profilePic, 
                    bio: data.bio,
                    "privacy.hidePhone": data.hidePhone,
                    "privacy.hideName": data.hideName
                },
                { new: true }
            );
            socket.emit('update_success', updatedUser);
        } catch (err) { socket.emit('error_msg', "Update လုပ်မရပါ။"); }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`GLOW Z-SPACE Live on ${PORT}`));