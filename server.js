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
    socket.on('register_user', async (data) => {
        try {
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
        } catch (err) {
            socket.emit('error_msg', "System Error: အကောင့်ဖွင့်၍ မရသေးပါ။");
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server is running on ${PORT}`));