const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// تخزين البيانات في الذاكرة (سيتم تصفيرها عند إعادة تشغيل السيرفر)
let votes = {
    "Naruto": [],
    "One Piece": [],
    "HXH": [],
    "Bleach": []
};

io.on('connection', (socket) => {
    // إرسال النتائج الحالية فور دخول أي شخص (للأدمن)
    socket.emit('updateVotes', votes);

    socket.on('castVote', (data) => {
        const { anime, user } = data;
        
        // التأكد من أن الخيار موجود
        if (votes[anime]) {
            votes[anime].push(user);
            // تحديث جميع المستخدمين (وخاصة الأدمن) بالنتائج الجديدة
            io.emit('updateVotes', votes);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});