const express = require('express');
const path = require('path');
const app = express();

// Render အတွက် Port သတ်မှတ်ခြင်း (Default: 10000)
const port = process.env.PORT || 10000;

// ၁။ Static Files (HTML, CSS, JS, Images) များရှိရာ Public Folder ကို ချိတ်ခြင်း
app.use(express.static(path.join(__dirname, 'public')));

// ၂။ စာမျက်နှာများသို့ လမ်းကြောင်းဖောက်ခြင်း (Routes)

// Login/Register Page (Phone Number Auth)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard Page (Owner VIP Mode ပါဝင်သည်)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// စာရင်းကြည့်ရန် Messages List Page (Messenger Home လိုမျိုး)
app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'messages.html'));
});

// တစ်ယောက်ချင်းစီ သီးသန့်စကားပြောရန် Inbox Page
app.get('/inbox', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inbox.html'));
});

// Settings နဲ့ တခြား စာမျက်နှာများ
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/edit-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-profile.html'));
});

app.get('/appearance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'appearance.html'));
});

app.get('/security', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'security.html'));
});

app.get('/about-device', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about-device.html'));
});

// ၃။ Catch-all Middleware: မရှိတဲ့ Link တွေဝင်ရင် Index (Login) ဆီ ပြန်ပို့မယ်
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ၄။ Server စတင်နိုးကြားခြင်း
app.listen(port, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 Z-SPACE ENGINE: PRIVATE MESSAGING ACTIVE`);
    console.log(`📡 Port: ${port}`);
    console.log(`🔗 Preview: http://localhost:${port}`);
    console.log(`-------------------------------------------`);
});