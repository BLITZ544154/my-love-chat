const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// public folder ထဲက Static ဖိုင်တွေကို သုံးခွင့်ပေးမယ်
app.use(express.static(path.join(__dirname, 'public')));

// အဓိက Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard စာမျက်နှာ
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ဘယ် Link ပဲရိုက်ရိုက် Home ကို ပြန်ပို့မယ့် Catch-all route (Fix for Express 5+)
app.get('/:path*', (req, res) => {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Z-SPACE Engine is now Live on port ${port}`);
});