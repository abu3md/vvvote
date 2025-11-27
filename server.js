// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 🔑 يجب استخدام المنفذ الذي يحدده Render (process.env.PORT)
const PORT = process.env.PORT || 3000;

// خدمة الملفات الثابتة من مجلد 'public'
app.use(express.static('public'));

let votes = {}; 

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);
    
    socket.emit('update_results', votes);

    socket.on('submit_vote', (data) => {
        const { username, team } = data;
        
        // 1. إزالة أي تصويت سابق لهذا المستخدم
        for (const existingTeam in votes) {
            votes[existingTeam] = votes[existingTeam].filter(name => name !== username);
        }
        
        // 2. إضافة التصويت الجديد
        if (!votes[team]) {
            votes[team] = [];
        }
        votes[team].push(username);
        
        console.log(`Vote received from ${username} for ${team}`);

        io.emit('update_results', votes);
    });

    socket.on('reset_all', () => {
        votes = {};
        console.log('All votes have been reset by Admin.');
        io.emit('update_results', votes);
    });

    socket.on('delete_voter', (data) => {
        const { voterName, team } = data;

        if (votes[team]) {
            votes[team] = votes[team].filter(name => name !== voterName);
            
            if (votes[team].length === 0) {
                delete votes[team];
            }
            
            console.log(`Voter ${voterName} removed from ${team}.`);
            io.emit('update_results', votes);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});