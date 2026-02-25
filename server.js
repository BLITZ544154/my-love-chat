const express = require('express');
const path = require('path');
const app = express();

// Render အတွက် Port သတ်မှတ်ခြင်း (Default: 10000)
const port = process.env.PORT || 10000;

// ၁။ Static Files (HTML, CSS, JS, Images) များရှိရာ Public Folder ကို ချိတ်ခြင်း
app.use(express.static(path.join(__dirname, 'public')));

// ၂။ Page Routes (စာမျက်နှာများသို့ လမ်းကြောင်းဖောက်ခြင်း)

// Login Page (Index)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard Page
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Settings Main Page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Edit Profile Page
app.get('/edit-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-profile.html'));
});

// Appearance (Theme Shop) Page
app.get('/appearance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'appearance.html'));
});

// Security (2FA & Password) Page
app.get('/security', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'security.html'));
});

// About Device (Session Manager) Page
app.get('/about-device', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about-device.html'));
});

// ၃။ Catch-all Middleware: မရှိတဲ့ Link တွေဝင်ရင် Index ဆီ ပြန်ပို့မယ် (Express 5 Fix)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ၄။ Server စတင်နိုးကြားခြင်း
app.listen(port, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 Z-SPACE ENGINE IS RUNNING!`);
    console.log(`📡 Port: ${port}`);
    console.log(`🔗 Preview: http://localhost:${port}`);
    console.log(`-------------------------------------------`);
});