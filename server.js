const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); });
app.get('/settings', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'settings.html')); });

app.use((req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.listen(port, () => { console.log(`Z-SPACE Active on ${port}`); });