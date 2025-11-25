// (ملف الخادم - server.js)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); 

// 🔑 كلمة السر الجديدة
const ADMIN_PASSWORD = 'Samer#1212';
// مسار ملف حفظ البيانات
const DATA_FILE = path.join(__dirname, 'votes.json');

let votes = {}; // متغير يحمل بيانات التصويت في الذاكرة

// ----------------------------------------------------
// 🟢 1. تعريف وظائف تأمين البيانات (يجب أن تكون في الأعلى)
// ----------------------------------------------------
function loadVotes() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            votes = JSON.parse(data);
            console.log('Votes loaded from file successfully.');
        } else {
            console.log('votes.json file not found, starting with empty votes.');
            votes = {};
        }
    } catch (error) {
        console.error('Error loading votes:', error);
        votes = {};
    }
}

function saveVotes() {
    try {
        const data = JSON.stringify(votes, null, 2);
        fs.writeFileSync(DATA_FILE, data, 'utf8');
        console.log('Votes saved to file successfully.');
    } catch (error) {
        console.error('Error saving votes:', error);
    }
}

// ----------------------------------------------------
// 🟢 2. استدعاء الدالة (يجب أن يكون بعد تعريفها مباشرة)
// ----------------------------------------------------
loadVotes(); 

// يخدم ملفات العميل الثابتة
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // إرسال البيانات الحالية فور الاتصال
    socket.emit('update_results', votes);

    // معالجة التصويت الجديد
    socket.on('new_vote', (data) => {
        votes[data.username] = data.team;
        io.emit('update_results', votes);
        saveVotes(); 
    });

    // معالجة تسجيل دخول الأدمن
    socket.on('admin_login', (data, callback) => {
        if (data.password === ADMIN_PASSWORD) {
            callback({ success: true, votes: votes });
        } else {
            callback({ success: false });
        }
    });

    // معالجة حذف صوت معين
    socket.on('delete_vote', (usernameToDelete) => {
        if (votes[usernameToDelete]) {
            delete votes[usernameToDelete];
            io.emit('update_results', votes);
            saveVotes(); 
        }
    });

    // معالجة تصفير جميع الأصوات
    socket.on('reset_votes', () => {
        votes = {};
        io.emit('update_results', votes);
        saveVotes(); 
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});