const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://stunchou493_db_user:SroWdYcunJAibvyH@cluster0.mjzoi0g.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DATABASE CONNECTED!"))
    .catch(err => {
        console.error("❌ DB ERROR:", err);
        process.exit(1);
    });

// Message Schema
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    isEdited: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- APIs ---
app.post('/api/send', async (req, res) => {
    try {
        const msg = new Message(req.body);
        await msg.save();
        res.json({ success: true, msg });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:u1/:u2', async (req, res) => {
    try {
        const msgs = await Message.find({
            $or: [
                { sender: req.params.u1, receiver: req.params.u2 },
                { sender: req.params.u2, receiver: req.params.u1 }
            ]
        }).sort('timestamp');
        res.json(msgs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- UI Routes ---
app.get('/main', (req, res) => res.sendFile(path.join(__dirname, 'public', 'main.html')));
app.get('/inbox', (req, res) => res.sendFile(path.join(__dirname, 'public', 'inbox.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// --- The Ultimate Wildcard Fix for Express 5 ---
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Z-SPACE RUNNING ON PORT ${PORT}`);
});