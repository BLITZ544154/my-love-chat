const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/communityApp?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("System Ready! ✅"));

// User Schema - Point တွေနဲ့ RS စနစ်အတွက်
const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: String,
    points: { type: Number, default: 0 },
    partnerPhone: { type: String, default: null }, 
    rsStartDate: { type: Date, default: null },
    avatar: { type: String, default: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }
});
const User = mongoose.model('User', userSchema);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    // Register
    socket.on('register', async (data) => {
        try {
            const hash = await bcrypt.hash(data.password, 10);
            const newUser = new User({ phone: data.phone, password: hash, name: data.name });
            await newUser.save();
            socket.emit('register_success');
        } catch (e) { socket.emit('error_msg', "ဖုန်းနံပါတ် ရှိပြီးသားပါ!"); }
    });

    // Login
    socket.on('login', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else {
            socket.emit('error_msg', "ဖုန်း သို့မဟုတ် Password မှားနေပါတယ်!");
        }
    });

    // Point ပေးခြင်း (Daily)
    socket.on('daily_checkin', async (phone) => {
        const user = await User.findOneAndUpdate({ phone }, { $inc: { points: 50 } }, { new: true });
        socket.emit('update_user', user);
    });

    // Chat Logic (Global)
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Backend Live on ${PORT}`));