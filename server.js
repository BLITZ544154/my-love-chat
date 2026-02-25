const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection (မင်းရဲ့ Password ထည့်ပြီးသား)
const MONGO_URI = 'mongodb+srv://stunchou493_db_user:SroWdYcunJAibvyH@cluster0.mjzoi0g.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DATABASE CONNECTED SUCCESSFULLY!"))
    .catch(err => console.log("❌ DB CONNECTION ERROR:", err));

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

// စာပို့ခြင်း
app.post('/api/send', async (req, res) => {
    try {
        const msg = new Message(req.body);
        await msg.save();
        res.json({ success: true, msg });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// နှစ်ယောက်ကြားစာများ ဆွဲထုတ်ခြင်း
app.get('/api/messages/:u1/:u2', async (req, res) => {
    const msgs = await Message.find({
        $or: [
            { sender: req.params.u1, receiver: req.params.u2 },
            { sender: req.params.u2, receiver: req.params.u1 }
        ]
    }).sort('timestamp');
    res.json(msgs);
});

// စာဖျက်ခြင်း (Unsend for Everyone)
app.delete('/api/message/:id', async (req, res) => {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// စာပြင်ခြင်း (Edit)
app.put('/api/message/:id', async (req, res) => {
    await Message.findByIdAndUpdate(req.params.id, { text: req.body.text, isEdited: true });
    res.json({ success: true });
});

// Routes
app.get('/main', (req, res) => res.sendFile(path.join(__dirname, 'public', 'main.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));