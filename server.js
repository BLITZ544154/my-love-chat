const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Database Connection
const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/blitzApp?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("System Ready! 🚀"));

const User = mongoose.model('User', new mongoose.Schema({
    phone: String, email: String, password: String, name: String, points: { type: Number, default: 0 }
}));

// Gmail Setup (Updated with your new App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'stunchou493@gmail.com', //
        pass: 'tovmlaupjjudauce'    // 👈 ခင်ဗျားပေးတဲ့ ကုဒ်အသစ်
    }
});

let tempUsers = {};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('request_otp', async (data) => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        tempUsers[data.email] = { ...data, otp };

        const mailOptions = {
            from: '"BLITZ Support" <stunchou493@gmail.com>',
            to: data.email,
            subject: 'BLITZ App OTP Code',
            text: `မင်္ဂလာပါ ${data.name}၊ အကောင့်ဖွင့်ရန် OTP မှာ ${otp} ဖြစ်သည်။`
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.log("MAIL ERROR:", err.message);
                socket.emit('error_msg', "Email ပို့လို့မရပါဘူး။ Gmail App Password ကို ပြန်စစ်ပါ။"); //
            } else {
                socket.emit('otp_sent');
            }
        });
    });

    socket.on('verify_otp', async ({ email, otp }) => {
        const temp = tempUsers[email];
        if (temp && temp.otp === otp) {
            const hash = await bcrypt.hash(temp.password, 10);
            const newUser = new User({ phone: temp.phone, email: temp.email, name: temp.name, password: hash });
            await newUser.save();
            delete tempUsers[email];
            socket.emit('register_success');
        } else {
            socket.emit('error_msg', "OTP ကုဒ် မှားယွင်းနေပါသည်။");
        }
    });

    socket.on('login', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else {
            socket.emit('error_msg', "ဖုန်း သို့မဟုတ် Password မှားနေသည်။");
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));