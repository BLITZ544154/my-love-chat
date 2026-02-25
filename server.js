const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// ၁။ Static ဖိုင်တွေကို အရင်ဖတ်ခိုင်းမယ်
app.use(express.static(path.join(__dirname, 'public')));

// ၂။ အဓိက စာမျက်နှာများအတွက် Route သတ်မှတ်မယ်
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ၃။ Catch-all: အပေါ်က Route တွေနဲ့မကိုင်ရင် index.html ကိုပဲ ပို့ပေးမယ် (Error-free way)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});