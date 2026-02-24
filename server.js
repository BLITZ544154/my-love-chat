const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Socket.io ကို CORS setting နဲ့ သေချာဖွင့်မယ်
const io = new Server(server, {
    cors: { origin: "*" }
});

const mongoURI = "mongodb+srv://stunchou493_db_user:HPPezbekl8xSn0ju@cluster0.mjzoi0g.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("Connected to MongoDB! ✅"))
    .catch(err => console.error("DB Error: ❌", err));

const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', async (socket) => {
    console.log('New User Connected! ID:', socket.id); // ဒါပေါ်လာရင် ချိတ်မိပြီ

    try {
        const oldMessages = await Message.find().sort({ time: 1 }).limit(100);
        socket.emit('load messages', oldMessages);
    } catch (e) { console.log(e); }

    socket.on('chat message', async (msg) => {
        console.log('Message received:', msg);
        io.emit('chat message', msg);
        try {
            await new Message(msg).save();
        } catch (e) { console.log(e); }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});