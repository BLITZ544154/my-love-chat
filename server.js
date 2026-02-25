const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' })); // ပုံတင်ဖို့အတွက် limit တိုးထားတယ်
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://stunchou493_db_user:SroWdYcunJAibvyH@cluster0.mjzoi0g.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI).then(() => console.log("✅ Z-SPACE ENGINE READY"));

// --- User Schema ---
const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    bio: String,
    avatar: String, // Base64 ပုံသိမ်းမယ့်နေရာ
    privacy: {
        showNumber: { type: String, default: 'Everyone' } // Everyone သို့မဟုတ် Nobody
    },
    settings: {
        notiSound: { type: String, default: 'ding.mp3' }
    }
});
const User = mongoose.model('User', userSchema);

// --- Message Schema ---
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- APIs ---
app.post('/api/user/update', async (req, res) => {
    try {
        const { phone, name, bio, avatar, privacy, settings } = req.body;
        await User.findOneAndUpdate({ phone }, { name, bio, avatar, privacy, settings }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/user/:phone', async (req, res) => {
    const user = await User.findOne({ phone: req.params.phone });
    res.json(user);
});

app.post('/api/send', async (req, res) => {
    const msg = new Message(req.body);
    await msg.save();
    res.json({ success: true });
});

app.get('/api/messages/:u1/:u2', async (req, res) => {
    const { u1, u2 } = req.params;
    const msgs = await Message.find({ $or: [{ sender: u1, receiver: u2 }, { sender: u2, receiver: u1 }] }).sort('timestamp');
    res.json(msgs);
});

// --- Routing (chat ဖယ်လိုက်ပြီ) ---
const uiFiles = ['main', 'dashboard', 'inbox', 'messages', 'settings', 'edit-profile', 'security', 'about-device', 'appearance'];
uiFiles.forEach(file => {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, 'public', `${file}.html`)));
});
app.get(/^(?!\/api).*$/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(process.env.PORT || 10000);