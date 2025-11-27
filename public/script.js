// public/script.js

const socket = io();
const ADMIN_PASSWORD = 'admin'; // يمكنك تغيير كلمة السر هنا

// ------------------------------------------------------------------
// 🔑 منطق تسجيل الدخول
// ------------------------------------------------------------------

function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('admin-password');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username) {
        alert("الرجاء إدخال اسمك أولاً.");
        return;
    }

    // إخفاء صفحة تسجيل الدخول
    document.getElementById('login-page').classList.add('hidden');

    if (password === ADMIN_PASSWORD) {
        // إذا كان المدير: إظهار صفحة الأدمن فقط
        document.getElementById('admin-page').classList.remove('hidden');
        // يمكن للأدمن رؤية الأزرار، لكن لن نقوم بإظهارها هنا افتراضياً
    } else {
        // إذا كان مستخدماً عادياً: إظهار صفحة التصويت المغلقة فقط
        document.getElementById('voting-page').classList.remove('hidden');
        
        // 🚨 إخفاء أزرار التصويت والتأكد من ظهور رسالة الإغلاق
        document.getElementById('vote-buttons-container').classList.add('hidden');
        document.getElementById('closed-message').classList.remove('hidden');
    }
}

// ------------------------------------------------------------------
// 🔒 منطق التصويت (هذا الكود لن يعمل فعلياً ما دامت الأزرار مخفية للعامة)
// ------------------------------------------------------------------

function vote(teamName) {
    const username = document.getElementById('username').value.trim();
    
    // إرسال التصويت إلى الخادم
    socket.emit('submit_vote', { username: username, team: teamName });
    
    // إخفاء الأزرار وإظهار رسالة الحالة بعد التصويت
    document.getElementById('vote-buttons-container').classList.add('hidden');
    document.getElementById('status-msg').classList.remove('hidden');
}

function reVote() {
    // إظهار الأزرار مرة أخرى وإخفاء رسالة الحالة
    document.getElementById('vote-buttons-container').classList.remove('hidden');
    document.getElementById('status-msg').classList.add('hidden');
}

// ------------------------------------------------------------------
// 🛠️ منطق الأدمن
// ------------------------------------------------------------------

// تحديث النتائج عند استقبالها من الخادم
socket.on('update_results', (votes) => {
    const resultsContainer = document.getElementById('results-container');
    const activityNames = ["One Piece", "HXH", "Bleach", "Demon Slayer"]; 
    const shadowColors = {
        "One Piece": "shadow-red",
        "HXH": "shadow-green",
        "Bleach": "shadow-orange",
        "Demon Slayer": "shadow-purple"
    };

    let totalVotes = 0;
    for (const key in votes) {
        totalVotes += votes[key].length;
    }
    document.getElementById('total-votes').textContent = `إجمالي الأصوات: ${totalVotes}`;

    let html = '';

    const allResults = activityNames.map(activity => {
        const voters = votes[activity] || [];
        const count = voters.length;
        const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
        
        return { activity, count, percentage, voters };
    }).sort((a, b) => b.count - a.count);

    allResults.forEach(result => {
        const barColorClass = shadowColors[result.activity] || "shadow-gray";
        const voterNamesHtml = result.voters.map(name => 
            `<span class="voter-name" onclick="deleteVoter('${name}', '${result.activity}')">${name}</span>`
        ).join('');

        html += `
            <div class="result-card">
                <h4 style="margin: 0;">${result.activity} (${result.count} صوت) - ${result.percentage}%</h4>
                <div class="bar-container" style="margin-top: 5px;">
                    <div class="vote-bar ${barColorClass}" style="width: ${result.percentage}%; height: 100%; border-radius: inherit;"></div>
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; text-align: left;">
                    ${voterNamesHtml}
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
});

// إرسال طلب تصفير الأصوات للخادم
function resetAll() {
    if (confirm("هل أنت متأكد من تصفير جميع الأصوات؟")) {
        socket.emit('reset_all');
    }
}

// إرسال طلب حذف مصوت للخادم
function deleteVoter(voterName, team) {
    if (confirm(`هل أنت متأكد من حذف صوت ${voterName}؟`)) {
        socket.emit('delete_voter', { voterName, team });
    }
}