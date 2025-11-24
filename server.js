const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// هيكل البيانات
// votes: لتخزين عدد الأصوات لكل أنمي
// votersMap: لتتبع كل مستخدم ماذا صوت (لتسهيل الحذف)
let votes = {
    "Naruto": [],
    "One Piece": [],
    "HXH": [],
    "Bleach": []
};

// خريطة: "اسم_المستخدم": "اسم_الأنمي"
let votersMap = {};

io.on('connection', (socket) => {
    // إرسال الوضع الحالي عند الدخول
    socket.emit('updateVotes', votes);

    // --- استقبال تصويت جديد ---
    socket.on('castVote', (data) => {
        const { anime, user } = data;
        
        // إذا كان المستخدم قد صوت سابقاً، نحذف صوته القديم أولاً (لأمان أكثر)
        if (votersMap[user]) {
            const oldAnime = votersMap[user];
            votes[oldAnime] = votes[oldAnime].filter(u => u !== user);
        }

        // إضافة الصوت الجديد
        if (votes[anime]) {
            votes[anime].push(user);
            votersMap[user] = anime;
            io.emit('updateVotes', votes);
        }
    });

    // --- (أدمن) تصفير كل الأصوات ---
    socket.on('resetAllVotes', () => {
        votes = { "Naruto": [], "One Piece": [], "HXH": [], "Bleach": [] };
        votersMap = {};
        io.emit('updateVotes', votes);
        // أمر خاص لإجبار المتصفحات على مسح الذاكرة المحلية
        io.emit('forceResetLocal'); 
    });

    // --- (أدمن) حذف صوت مستخدم معين ---
    socket.on('deleteUserVote', (userName) => {
        const animeVoted = votersMap[userName];
        if (animeVoted && votes[animeVoted]) {
            // حذف من القائمة
            votes[animeVoted] = votes[animeVoted].filter(u => u !== userName);
            // حذف من الخريطة
            delete votersMap[userName];
            io.emit('updateVotes', votes);
            // إخبار المستخدم بأنه تم حذف صوته ليتمكن من التصويت مجدداً
            io.emit('userVoteDeleted', userName);
        }
    });

    // --- (مستخدم) تراجع عن التصويت ---
    socket.on('retractVote', (user) => {
        const animeVoted = votersMap[user];
        if (animeVoted) {
            votes[animeVoted] = votes[animeVoted].filter(u => u !== user);
            delete votersMap[user];
            io.emit('updateVotes', votes);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});