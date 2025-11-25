// (كود الخادم الصحيح - server.js)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
// 🔑 يجب استدعاء socket.io بهذه الطريقة في الخادم
const socketIo = require('socket.io'); 

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // 🔑 يجب استخدام الكائن الناتج هنا لـ io

// 🔑 كلمة السر الجديدة
const ADMIN_PASSWORD = 'Samer#1212';
// مسار ملف حفظ البيانات
const DATA_FILE = path.join(__dirname, 'votes.json');

let votes = {}; // متغير يحمل بيانات التصويت في الذاكرة

// ... باقي وظائف loadVotes و saveVotes ...

loadVotes();

// يخدم ملفات العميل الثابتة
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => { 
    // ... باقي منطق الاتصال ...
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});