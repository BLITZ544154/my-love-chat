const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
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

// ၁။ စာပို့ခြင်း
app.post('/api/send', async (req, res) => {
    try {
        const msg = new Message(req.body);
        await msg.save();
        res.json({ success: true, msg });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ၂။ စာများဆွဲထုတ်ခြင်း
app.get('/api/messages/:u1/:u2', async (req, res) => {
    try {
        const { u1, u2 } = req.params;
        const msgs = await Message.find({
            $or: [
                { sender: u1, receiver: u2 },
                { sender: u2, receiver: u1 }
            ]
        }).sort('timestamp');
        res.json(msgs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ၃။ စာပြင်ခြင်း (Edit)
app.put('/api/message/:id', async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { 
            text: req.body.text, 
            isEdited: true 
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ၄။ စာဖျက်ခြင်း (Delete/Unsend)
app.delete('/api/message/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Routing (Fix for PathError) ---

// UI File တွေကို တစ်ခုချင်း ချိတ်ပေးထားတာက အလုံခြုံဆုံးပဲ
const uiFiles = ['main', 'dashboard', 'inbox', 'messages', 'settings', 'edit-profile', 'security', 'about-device', 'appearance'];

uiFiles.forEach(file => {
    app.get(`/${file}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${file}.html`));
    });
});

// အခြားဘာပဲလာလာ index.html ဆီ ပို့မယ် (RegExp Wildcard)
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Z-SPACE ENGINE RUNNING ON PORT ${PORT}`);
});