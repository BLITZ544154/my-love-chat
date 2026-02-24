const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

// Database Connection
const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/blitzApp?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
    .then(() => console.log("GLOW Z-SPACE Database Connected! 🚀"))
    .catch(err => console.log("DB Error:", err));

// User Schema (Inventory & Points ပါဝင်သည်)
const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    password: String,
    profilePic: { type: String, default: '' },
    bio: { type: String, default: 'Welcome to GLOW Z-SPACE' },
    points: { type: Number, default: 500 }, // Default points for new users
    badges: { type: Array, default: [] },   // Bought items (badges, effects)
    privacy: {
        hidePhone: { type: Boolean, default: false }
    }
}));

// Payment Request Schema (For Kpay Screenshot)
const Payment = mongoose.model('Payment', new mongoose.Schema({
    userId: String,
    userPhone: String,
    amount: String,
    screenshot: String,
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '15mb' })); // ပုံတွေတင်ဖို့ Limit တိုးထားတယ်
app.use(express.urlencoded({ limit: '15mb', extended: true }));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Login logic
    socket.on('login_user', async (data) => {
        try {
            const user = await User.findOne({ phone: data.phone });
            if (user && await bcrypt.compare(data.password, user.password)) {
                socket.emit('login_success', user);
            } else {
                socket.emit('error_msg', "ဖုန်းနံပါတ် သို့မဟုတ် Password မှားနေပါသည်။");
            }
        } catch (err) {
            socket.emit('error_msg', "Server Error ဖြစ်သွားပါသည်။");
        }
    });

    // Register logic
    socket.on('register_user', async (data) => {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const newUser = new User({
                phone: data.phone,
                name: data.name,
                password: hashedPassword
            });
            await newUser.save();
            socket.emit('register_success');
        } catch (err) {
            socket.emit('error_msg', "အကောင့်ဖွင့်မရပါ။ ဖုန်းနံပါတ်ရှိပြီးသား ဖြစ်နိုင်ပါသည်။");
        }
    });

    // Profile & Store Update (Point နှုတ်ခြင်းနှင့် Badge ထည့်ခြင်း)
    socket.on('update_profile', async (data) => {
        try {
            const updateData = {};
            if (data.profilePic !== undefined) updateData.profilePic = data.profilePic;
            if (data.bio !== undefined) updateData.bio = data.bio;
            if (data.points !== undefined) updateData.points = data.points;
            if (data.badges !== undefined) updateData.badges = data.badges;
            if (data.hidePhone !== undefined) updateData["privacy.hidePhone"] = data.hidePhone;

            const updatedUser = await User.findOneAndUpdate(
                { phone: data.phone },
                { $set: updateData },
                { new: true }
            );
            socket.emit('update_success', updatedUser);
        } catch (err) {
            socket.emit('error_msg', "Update လုပ်ဆောင်ချက် မအောင်မြင်ပါ။");
        }
    });

    // Mission Point Reward
    socket.on('complete_mission', async (data) => {
        try {
            const user = await User.findOneAndUpdate(
                { phone: data.phone },
                { $inc: { points: data.rewardPoints } },
                { new: true }
            );
            socket.emit('update_success', user);
        } catch (err) {
            console.log("Mission error");
        }
    });

    // Kpay Payment Submission
    socket.on('submit_payment', async (data) => {
        try {
            const newPayment = new Payment(data);
            await newPayment.save();
            socket.emit('payment_submitted', "Screenshot ပို့ပြီးပါပြီ။ Admin စစ်ဆေးပြီး Point ထည့်ပေးပါမည်။");
        } catch (err) {
            socket.emit('error_msg', "Payment Submission Failed!");
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`GLOW Z-SPACE Server is running on Port ${PORT}`);
});