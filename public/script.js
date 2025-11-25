// (يفترض أن هذا هو ملف الخادم الذي يعمل مع Socket.io)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 🆕 كلمة السر الجديدة
const ADMIN_PASSWORD = 'Samer#1212';
// مسار ملف حفظ البيانات
const DATA_FILE = path.join(__dirname, 'votes.json');

let votes = {}; // متغير يحمل بيانات التصويت في الذاكرة

// ----------------------------------------------------
// 🆕 وظائف تأمين البيانات (Persistence Logic)
// ----------------------------------------------------

// تحميل الأصوات من ملف votes.json عند بدء تشغيل الخادم
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

// حفظ الأصوات إلى ملف votes.json
function saveVotes() {
    try {
        const data = JSON.stringify(votes, null, 2);
        fs.writeFileSync(DATA_FILE, data, 'utf8');
        console.log('Votes saved to file successfully.');
    } catch (error) {
        console.error('Error saving votes:', error);
    }
}

// تحميل البيانات عند بدء تشغيل الخادم
loadVotes();
// ----------------------------------------------------


// يخدم ملفات العميل الثابتة
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // إرسال البيانات الحالية فور الاتصال
    socket.emit('update_results', votes);

    // معالجة تسجيل الدخول
    socket.on('login', (data) => {
        // ... (منطق تسجيل دخول المستخدم العادي يظل كما هو)
    });

    // معالجة التصويت الجديد
    socket.on('new_vote', (data) => {
        // ... (منطق التحقق والتصويت)
        votes[data.username] = data.team;
        io.emit('update_results', votes);
        saveVotes(); // 🔑 حفظ البيانات بعد التصويت
    });

    // 🆕 معالجة تسجيل دخول الأدمن
    socket.on('admin_login', (data, callback) => {
        // التحقق من كلمة السر الجديدة Samer#1212
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
            saveVotes(); // 🔑 حفظ البيانات بعد الحذف
        }
    });

    // معالجة تصفير جميع الأصوات
    socket.on('reset_votes', () => {
        votes = {};
        io.emit('update_results', votes);
        saveVotes(); // 🔑 حفظ البيانات بعد التصفير
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});