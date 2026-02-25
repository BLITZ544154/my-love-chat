const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// မရှိတဲ့ link တွေဝင်ရင် index ကိုပဲ ပြန်လွှတ်မယ်
app.get('*', (req, res) => {
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Z-SPACE Engine running on port ${port}`);
});