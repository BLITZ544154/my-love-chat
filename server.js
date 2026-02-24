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

// User Database Model
const User = mongoose.model('User', new mongoose.Schema({
    phone: String, 
    email: String, 
    password: String, 
    name: String, 
    points: { type: Number, default: 0 }
}));

// Gmail OTP ပို့ရန် Setup (ခင်ဗျားရဲ့ Gmail နဲ့ App Password ကို သုံးထားပါတယ်)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'stunchou493@gmail.com', // 👈 ခင်ဗျားရဲ့ Gmail
        pass: 'vtzk yjrz smsa vnyr'    // 👈 ခင်ဗျားယူထားတဲ့ App Password
    }
});

let tempUsers = {}; // OTP စစ်နေစဉ်အတွင်း ခေတ္တသိမ်းဆည်းထားမည့်နေရာ

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    // ၁။ အကောင့်သစ်ဖွင့်ရန် OTP ပို့ခြင်း
    socket.on('request_otp', async (data) => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        tempUsers[data.email] = { ...data, otp };

        const mailOptions = {
            from: '"BLITZ Support" <stunchou493@gmail.com>',
            to: data.email,
            subject: 'BLITZ Community OTP Verification',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #00f2ff;">BLITZ App Verification</h2>
                    <p>မင်္ဂလာပါ ${data.name}၊</p>
                    <p>BLITZ Community မှာ အကောင့်ဖွင့်ဖို့အတွက် OTP ကုဒ်မှာ အောက်ပါအတိုင်းဖြစ်ပါတယ် -</p>
                    <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h1>
                    <p style="color: #666; font-size: 12px;">ဒီကုဒ်ကို ဘယ်သူ့ကိုမှ မပြောပါနဲ့။</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.log(err);
                socket.emit('error_msg', "Email ပို့လို့မရပါဘူး။ Gmail App Password ကို ပြန်စစ်ပေးပါ။");
            } else {
                socket.emit('otp_sent');
            }
        });
    });

    // ၂။ OTP စစ်ဆေးပြီး အောင်မြင်ပါက Database ထဲ သိမ်းခြင်း
    socket.on('verify_otp', async ({ email, otp }) => {
        const temp = tempUsers[email];
        if (temp && temp.otp === otp) {
            const hash = await bcrypt.hash(temp.password, 10);
            const newUser = new User({ 
                phone: temp.phone, 
                email: temp.email, 
                name: temp.name, 
                password: hash 
            });
            await newUser.save();
            delete tempUsers[email];
            socket.emit('register_success');
        } else {
            socket.emit('error_msg', "OTP ကုဒ် မှားယွင်းနေပါသည်။");
        }
    });

    // ၃။ Login ဝင်ခြင်း
    socket.on('login', async (data) => {
        const user = await User.findOne({ phone: data.phone });
        if (user && await bcrypt.compare(data.password, user.password)) {
            socket.emit('login_success', user);
        } else {
            socket.emit('error_msg', "ဖုန်းနံပါတ် သို့မဟုတ် Password မှားယွင်းနေပါသည်။");
        }
    });

    // ၄။ Point စနစ် (Daily Check-in)
    socket.on('daily_checkin', async (phone) => {
        const user = await User.findOneAndUpdate({ phone }, { $inc: { points: 50 } }, { new: true });
        socket.emit('update_user', user);
    });

    // ၅။ Chat စနစ် (Global Chat)
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT} 🚀`));