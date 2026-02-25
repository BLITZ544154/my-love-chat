const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ၁။ MongoDB Connection (Render မှာ MONGO_URI variable ထည့်ထားရင် အဲဒါကို သုံးမယ်)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://stunchou493_db_user:SroWdYcunJAibvyH@cluster0.mjzoi0g.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DATABASE CONNECTED SUCCESSFULLY!"))
    .catch(err => {
        console.error("❌ DB CONNECTION ERROR:", err);
        process.exit(1); // Database မချိတ်မိရင် App ကို ရပ်လိုက်မယ်
    });

// ၂။ Message Schema
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    isEdited: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- APIs ---

// စာပို့ခြင်း
app.post('/api/send', async (req, res) => {
    try {
        const msg = new Message(req.body);
        await msg.save();
        res.json({ success: true, msg });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// စာများပြန်ခေါ်ခြင်း
app.get('/api/messages/:u1/:u2', async (req, res) => {
    try {
        const msgs = await Message.find({
            $or: [
                { sender: req.params.u1, receiver: req.params.u2 },
                { sender: req.params.u2, receiver: req.params.u1 }
            ]
        }).sort('timestamp');
        res.json(msgs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// စာဖျက်ခြင်း (Unsend for Everyone)
app.delete('/api/message/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// စာပြင်ခြင်း (Edit)
app.put('/api/message/:id', async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { 
            text: req.body.text, 
            isEdited: true 
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ၃။ Page Routes (Render အတွက် လမ်းကြောင်းများ)
app.get('/main', (req, res) => res.sendFile(path.join(__dirname, 'public', 'main.html')));
app.get('/inbox', (req, res) => res.sendFile(path.join(__dirname, 'public', 'inbox.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// ၄။ Wildcard Route (Express v5 Fix)
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ၅။ Port Listener (Render အတွက် 0.0.0.0 ထည့်ထားတာ ပိုစိတ်ချရတယ်)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Z-SPACE ENGINE IS RUNNING ON PORT ${PORT}`);
});