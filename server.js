// (ملف الخادم - server.js)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); 

// 🔑 كلمة السر للإدمن
const ADMIN_PASSWORD = 'Samer#1212';
// مسارات الملفات
const DATA_FILE = path.join(__dirname, 'votes.json'); // لحفظ الأصوات النشطة والمحذوفة
const LOG_FILE_CSV = path.join(__dirname, 'full_votes_log.csv'); // سجل CSV الكامل

let votes = {}; // الأصوات النشطة حالياً
let deletedVotesLog = {}; // سجل الأصوات المحذوفة

// ----------------------------------------------------
// وظائف تأمين البيانات (Persistence Logic)
// ----------------------------------------------------

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

function saveVotes() {
    try {
        const dataToSave = JSON.stringify({ active: votes, deleted: deletedVotesLog }, null, 2);
        fs.writeFileSync(DATA_FILE, dataToSave, 'utf8');
        console.log('Votes saved to file successfully.');
    } catch (error) {
        console.error('Error saving votes:', error);
    }
}

function updateCSVLog() {
    let csvContent = 'Timestamp,Username,Team,Status\n';
    
    // 1. إضافة الأصوات النشطة
    for (const username in votes) {
        const timestamp = new Date().toISOString(); 
        csvContent += `${timestamp},${username},${votes[username]},Active\n`;
    }
    
    // 2. إضافة الأصوات المحذوفة
    for (const username in deletedVotesLog) {
        const deleteTimestamp = deletedVotesLog[username].deletedAt || new Date().toISOString();
        const originalTeam = deletedVotesLog[username].team;
        csvContent += `${deleteTimestamp},${username},${originalTeam},Deleted\n`;
    }
    
    fs.writeFileSync(LOG_FILE_CSV, csvContent, 'utf8');
    console.log('CSV log updated successfully.');
}

loadVotes(); 

// ----------------------------------------------------
// منطق الخادم و Routes
// ----------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// 🆕 المسار الجديد: يسمح بتحميل ملف السجل بشكل آمن
app.get('/download-log', (req, res) => {
    // التحقق من كلمة السر عبر متغير 'key' في رابط التحميل (Query Parameter)
    const password = req.query.key; 
    
    if (password === ADMIN_PASSWORD) {
        // إذا تطابقت كلمة السر، يتم إرسال الملف للتحميل
        res.download(LOG_FILE_CSV, 'full_votes_log.csv'); 
    } else {
        // إذا لم تتطابق، يتم رفض الطلب
        res.status(401).send('غير مصرح لك. يجب توفير مفتاح سري للتحميل.');
    }
});

io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.emit('update_results', votes);

    socket.on('new_vote', (data) => {
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

    socket.on('delete_vote', (usernameToDelete) => {
        if (votes[usernameToDelete]) {
            deletedVotesLog[usernameToDelete] = {
                team: votes[usernameToDelete],
                deletedAt: new Date().toISOString()
            };

            delete votes[usernameToDelete];
            
            io.emit('update_results', votes);
            saveVotes(); 
            updateCSVLog(); 
        }
    });

    socket.on('reset_votes', () => {
        const resetTime = new Date().toISOString();
        
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