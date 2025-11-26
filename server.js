// (ملف الخادم - server.js)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); 

const ADMIN_PASSWORD = 'Samer#1212';
const DATA_FILE = path.join(__dirname, 'votes.json'); // لحفظ الأصوات النشطة والمحذوفة
const LOG_FILE_CSV = path.join(__dirname, 'full_votes_log.csv'); // سجل CSV الكامل

let votes = {}; // الأصوات النشطة حالياً
let deletedVotesLog = {}; // سجل الأصوات المحذوفة

// ----------------------------------------------------
// وظائف تأمين البيانات (الترتيب صحيح الآن)
// ----------------------------------------------------

// تحميل كلتا القائمتين (النشطة والمحذوفة)
function loadVotes() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            votes = parsedData.active || {};
            deletedVotesLog = parsedData.deleted || {};
            console.log('Votes and logs loaded successfully.');
        } else {
            console.log('votes.json file not found, starting fresh.');
            votes = {};
            deletedVotesLog = {};
        }
    } catch (error) {
        console.error('Error loading votes:', error);
        votes = {};
        deletedVotesLog = {};
    }
}

// حفظ كلتا القائمتين إلى ملف JSON واحد
function saveVotes() {
    try {
        const dataToSave = JSON.stringify({ active: votes, deleted: deletedVotesLog }, null, 2);
        fs.writeFileSync(DATA_FILE, dataToSave, 'utf8');
        console.log('Votes saved to file successfully.');
    } catch (error) {
        console.error('Error saving votes:', error);
    }
}

// وظيفة جديدة: إنشاء/تحديث ملف CSV بسجل البيانات كاملاً
function updateCSVLog() {
    // بناء محتوى CSV
    let csvContent = 'Timestamp,Username,Team,Status\n';
    
    // إضافة الأصوات النشطة
    for (const username in votes) {
        // استخدام تاريخ ووقت التصويت إذا كان متوفراً، وإلا استخدام الآن
        const timestamp = new Date().toISOString(); 
        csvContent += `${timestamp},${username},${votes[username]},Active\n`;
    }
    
    // إضافة الأصوات المحذوفة
    for (const username in deletedVotesLog) {
        const deleteTimestamp = deletedVotesLog[username].deletedAt || new Date().toISOString();
        const originalTeam = deletedVotesLog[username].team;
        csvContent += `${deleteTimestamp},${username},${originalTeam},Deleted\n`;
    }
    
    // 🔑 الكتابة إلى ملف CSV
    fs.writeFileSync(LOG_FILE_CSV, csvContent, 'utf8');
    console.log('CSV log updated successfully.');
}

// ----------------------------------------------------
// استدعاء الوظيفة عند بدء التشغيل
// ----------------------------------------------------
loadVotes(); 

// ----------------------------------------------------
// منطق الخادم و Socket.io
// ----------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.emit('update_results', votes);

    socket.on('new_vote', (data) => {
        // إذا قام شخص ما بالتصويت، يتم إزالته من سجل المحذوفات إن وجد (يعتبر صوتاً جديداً)
        if (deletedVotesLog[data.username]) {
            delete deletedVotesLog[data.username];
        }

        votes[data.username] = data.team;
        io.emit('update_results', votes);
        saveVotes();
        updateCSVLog(); 
    });

    socket.on('admin_login', (data, callback) => {
        if (data.password === ADMIN_PASSWORD) {
            callback({ success: true, votes: votes });
        } else {
            callback({ success: false });
        }
    });

    // تعديل: معالجة حذف صوت معين (نقله إلى سجل المحذوفات)
    socket.on('delete_vote', (usernameToDelete) => {
        if (votes[usernameToDelete]) {
            
            // 1. تسجيل البيانات في سجل الحذف
            deletedVotesLog[usernameToDelete] = {
                team: votes[usernameToDelete],
                deletedAt: new Date().toISOString()
            };

            // 2. حذف الصوت من القائمة النشطة
            delete votes[usernameToDelete];
            
            // 3. تحديث العرض والحفظ والسجل
            io.emit('update_results', votes);
            saveVotes(); 
            updateCSVLog(); 
        }
    });

    // تعديل: معالجة تصفير جميع الأصوات (نقلها إلى سجل المحذوفات)
    socket.on('reset_votes', () => {
        const resetTime = new Date().toISOString();
        
        // نقل جميع الأصوات النشطة إلى سجل المحذوفات
        for (const username in votes) {
            deletedVotesLog[username] = {
                team: votes[username],
                deletedAt: resetTime 
            };
        }

        votes = {};
        
        io.emit('update_results', votes);
        saveVotes();
        updateCSVLog(); 
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});