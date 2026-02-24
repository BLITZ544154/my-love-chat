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
mongoose.connect(mongoURI).then(() => console.log("System Ready! 🚀"));

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
    // တိုက်ရိုက် Register လုပ်ခြင်း (OTP မလိုတော့ပါ)
    socket.on('register_user', async (data) => {
        try {
            // ဖုန်းနံပါတ် ရှိပြီးသားလား စစ်ဆေးခြင်း
            const existingUser = await User.findOne({ phone: data.phone });
            if (existingUser) {
                return socket.emit('error_msg', "ဒီဖုန်းနံပါတ်နဲ့ အကောင့်ရှိပြီးသားပါ။");
            }

            const hash = await bcrypt.hash(data.password, 10);
            const newUser = new User({
                name: data.name,
                phone: data.phone,
                email: data.email,
                password: hash
            });

            await newUser.save();
            socket.emit('register_success');
            console.log(`New User: ${data.name} Registered! ✅`);
        } catch (err) {
            socket.emit('error_msg', "တစ်ခုခုမှားယွင်းနေပါသည်။");
        }
    });

    // Login လုပ်ခြင်း
    socket.on('login', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else {
            socket.emit('error_msg', "ဖုန်း သို့မဟုတ် Password မှားယွင်းနေပါသည်။");
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server Live on ${PORT}`));