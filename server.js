const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

// public folder ထဲက ဖိုင်တွေကို Static အဖြစ် သုံးခွင့်ပေးမယ်
app.use(express.static('public'));

// အဓိက Login Page (index.html) ကို ပို့ပေးမယ့်အပိုင်း
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard စာမျက်နှာကို တိုက်ရိုက်ခေါ်ရင် ပြပေးဖို့
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// မရှိတဲ့ Link တွေ ရိုက်ထည့်ရင် index.html ကိုပဲ ပြန်လွှတ်မယ် (Error fix version)
app.get('(.*)', (req, res) => {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Z-SPACE Engine is now Live on port ${port}`);
});