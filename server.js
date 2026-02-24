const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // ပုံတွေပို့ရင် error မတက်အောင် file size (10MB) တိုးထားတာပါ
});

// public folder ထဲက HTML ဖိုင်တွေကို သုံးမယ်
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User တစ်ယောက် ချိတ်ဆက်လာပါပြီ ❤️');

    // စာသား လက်ခံပြီး ပြန်ပို့ခြင်း
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    // ပုံ လက်ခံပြီး ပြန်ပို့ခြင်း
    socket.on('send image', (data) => {
        io.emit('display image', data);
    });

    socket.on('disconnect', () => {
        console.log('User တစ်ယောက် ထွက်သွားပါပြီ');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});