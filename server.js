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
mongoose.connect(mongoURI).then(() => console.log("Database Connected! 🚀"));

const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, unique: true },
    email: String,
    password: String,
    name: String,
    points: { type: Number, default: 0 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    // Register စနစ်
    socket.on('register_user', async (data) => {
        try {
            const existingUser = await User.findOne({ phone: data.phone });
            if (existingUser) return socket.emit('error_msg', "ဒီဖုန်းနံပါတ်နဲ့ အကောင့်ရှိပြီးသားပါ။");

            const hash = await bcrypt.hash(data.password, 10);
            const newUser = new User({ ...data, password: hash });
            await newUser.save();
            socket.emit('register_success');
        } catch (err) {
            socket.emit('error_msg', "Register လုပ်လို့ မရသေးပါ။");
        }
    });

    // Login စနစ် (အရင်အကောင့်နဲ့ ပြန်ဝင်ဖို့)
    socket.on('login_user', async (data) => {
        try {
            const user = await User.findOne({ phone: data.phone });
            if (user && await bcrypt.compare(data.password, user.password)) {
                socket.emit('login_success', user);
            } else {
                socket.emit('error_msg', "ဖုန်းနံပါတ် (သို့) Password မှားနေပါသည်။");
            }
        } catch (err) {
            socket.emit('error_msg', "Login Error ဖြစ်နေပါသည်။");
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server Live on ${PORT}`));