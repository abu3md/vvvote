// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
// 🔑 إعداد Socket.IO ليعمل مع خادم HTTP
const io = socketIo(server);

const PORT = 3000;

// 🟢 1. خدمة الملفات الثابتة (Static Files)
// هذا يخبر Express بأن يخدم جميع الملفات داخل مجلد 'public' (مثل index.html و style.css و script.js).
app.use(express.static('public'));

// 🗳️ تخزين الأصوات
// 'votes' هو كائن لتخزين الأصوات بشكل مؤقت. المفتاح هو اسم الأنمي، والقيمة هي مصفوفة بأسماء المصوتين.
let votes = {}; 
/* مثال على هيكل votes:
{
    "One Piece": ["عزوز", "أحمد"],
    "HXH": ["سارة"],
    "Demon Slayer": ["فهد", "ريم"]
}
*/

// 🔑 2. معالجة اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);
    
    // عند اتصال عميل جديد، أرسل له حالة التصويت الحالية
    socket.emit('update_results', votes);

    // 📩 معالجة حدث التصويت
    socket.on('submit_vote', (data) => {
        const { username, team } = data;
        
        // 1. إزالة أي تصويت سابق لهذا المستخدم
        for (const existingTeam in votes) {
            // filter: تزيل اسم المستخدم من أي قائمة تصويت سابقة
            votes[existingTeam] = votes[existingTeam].filter(name => name !== username);
        }
        
        // 2. إضافة التصويت الجديد
        if (!votes[team]) {
            votes[team] = [];
        }
        votes[team].push(username);
        
        console.log(`Vote received from ${username} for ${team}`);

        // 3. إرسال التحديث لجميع العملاء
        io.emit('update_results', votes);
    });

    // 🗑️ معالجة حدث تصفير التصويت (للمدير)
    socket.on('reset_all', () => {
        votes = {};
        console.log('All votes have been reset by Admin.');
        // إرسال كائن فارغ لجميع العملاء لتحديث النتائج
        io.emit('update_results', votes);
    });

    // ❌ معالجة حدث حذف مصوت فردي (للمدير)
    socket.on('delete_voter', (data) => {
        const { voterName, team } = data;

        if (votes[team]) {
            votes[team] = votes[team].filter(name => name !== voterName);
            
            // تنظيف الفريق إذا أصبح فارغاً
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

// 🚀 تشغيل الخادم
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Make sure to run the client-side code from the public folder.');
});