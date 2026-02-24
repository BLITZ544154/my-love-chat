const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- DATABASE CONNECTION ---
// ခင်ဗျားရဲ့ MongoDB Link ဖြစ်ပါတယ်
const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("Connected to MongoDB Atlas! ✅"))
    .catch(err => console.log("Database Connection Error: ❌", err));

// စာတွေကို သိမ်းဖို့ ပုံစံ (Schema) သတ်မှတ်မယ်
const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', async (socket) => {
    console.log('User connected');

    // User အသစ်ဝင်လာရင် စာဟောင်းတွေကို Database ထဲက ဆွဲထုတ်ပြမယ်
    try {
        const oldMessages = await Message.find().sort({ time: 1 });
        socket.emit('load messages', oldMessages);
    } catch (err) {
        console.error("Error loading messages:", err);
    }

    socket.on('chat message', async (msg) => {
        // စာပို့လိုက်တိုင်း Database ထဲကို လှမ်းသိမ်းမယ်
        try {
            const newMessage = new Message({ user: msg.user, text: msg.text });
            await newMessage.save();
            io.emit('chat message', msg);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});