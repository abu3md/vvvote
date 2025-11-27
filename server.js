// server.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'votes_log.csv'); 

const DOWNLOAD_PASSWORD = 'admin';

app.use(express.static('public'));

let votes = {};

// --- 1. دوال التعامل مع ملف CSV ---
function updateCSV() {
    let csvContent = 'Time,Username,Team,Status\n';
    const time = new Date().toISOString().replace('T', ' ').substr(0, 19);

    for (const team in votes) {
        votes[team].forEach(user => {
            csvContent += `${time},${user},${team},Active\n`;
        });
    }

    fs.writeFileSync(LOG_FILE, csvContent, 'utf8');
}

// --- 2. مسار تحميل الملف ---
app.get('/download-log', (req, res) => {
    const key = req.query.key;
    if (key === DOWNLOAD_PASSWORD) {
        if (fs.existsSync(LOG_FILE)) {
            res.download(LOG_FILE, 'votes_log.csv');
        } else {
            res.send('لم يتم إنشاء ملف سجل بعد (لا توجد أصوات).');
        }
    } else {
        res.status(403).send('كلمة المرور غير صحيحة لتحميل الملف.');
    }
});

// --- 3. اتصال Socket.io ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.emit('update_results', votes);

    socket.on('submit_vote', (data) => {
        const { username, team } = data;

        for (const t in votes) {
            votes[t] = votes[t].filter(u => u !== username);
        }

        if (!votes[team]) votes[team] = [];
        votes[team].push(username);

        updateCSV(); 
        io.emit('update_results', votes); 
    });

    socket.on('reset_all', () => {
        votes = {};
        updateCSV(); 
        io.emit('update_results', votes);
    });

    socket.on('delete_voter', (data) => {
        const { voterName, team } = data;
        if (votes[team]) {
            votes[team] = votes[team].filter(name => name !== voterName);
            updateCSV(); 
            io.emit('update_results', votes);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});