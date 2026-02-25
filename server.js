const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

// စာမျက်နှာ လမ်းကြောင်းများ
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/edit-profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit-profile.html')));
app.get('/appearance', (req, res) => res.sendFile(path.join(__dirname, 'public', 'appearance.html')));
app.get('/security', (req, res) => res.sendFile(path.join(__dirname, 'public', 'security.html')));
app.get('/about-device', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about-device.html')));

// 404 Redirect to Login
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, () => console.log(`Server started on port ${port}`));