const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// ၁။ Static Files (HTML, CSS, JS, Images, JSON) များရှိရာ Public Folder ကို ချိတ်ခြင်း
app.use(express.static(path.join(__dirname, 'public')));

// ၂။ Page Routes (တိုက်ရိုက် Link များ)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/edit-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-profile.html'));
});

// ၃။ Middleware Catch-all: မရှိတဲ့ Link များဝင်ရင် Index သို့ ပြန်ပို့ခြင်း (Express 5 Fix)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ၄။ Server စတင်ခြင်း
app.listen(port, () => {
    console.log(`Z-SPACE Engine is running on port ${port}`);
    console.log(`Live Preview: http://localhost:${port}`);
});