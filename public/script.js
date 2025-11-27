// public/script.js

// الاتصال بالخادم
const socket = io();

// 🔑 إعدادات المدير
const ADMIN_PASSWORD = 'admin'; 

// ------------------------------------------------------------------
// 1. وظيفة تسجيل الدخول (login)
// ------------------------------------------------------------------
function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('admin-password');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // التحقق من إدخال الاسم
    if (!username) {
        alert("الرجاء إدخال اسمك أولاً.");
        return;
    }

    // حفظ الاسم لاستخدامه لاحقاً
    localStorage.setItem('currentUser', username);

    // إخفاء صفحة تسجيل الدخول
    document.getElementById('login-page').classList.add('hidden');

    // 🕵️‍♂️ التحقق هل المستخدم هو المدير؟
    if (password === ADMIN_PASSWORD) {
        // --- حالة الأدمن ---
        document.getElementById('admin-page').classList.remove('hidden');
        document.getElementById('voting-page').classList.add('hidden'); 
    } else {
        // --- حالة المستخدم العادي ---
        document.getElementById('voting-page').classList.remove('hidden');
        document.getElementById('admin-page').classList.add('hidden'); 
        
        // ✅✅✅ التعديل هنا: فتح التصويت ✅✅✅
        
        // 1. إظهار أزرار التصويت (إزالة الكلاس hidden)
        document.getElementById('vote-buttons-container').classList.remove('hidden');
        
        // 2. إخفاء رسالة "التصويت مغلق"
        document.getElementById('closed-message').classList.add('hidden');
    }
}

// ------------------------------------------------------------------
// 2. وظيفة التصويت (vote)
// ------------------------------------------------------------------
function vote(teamName) {
    const username = localStorage.getItem('currentUser') || document.getElementById('username').value;
    
    if (!username) {
        alert("حدث خطأ في التعرف على الاسم، يرجى إعادة الدخول.");
        location.reload();
        return;
    }

    // إرسال التصويت إلى الخادم
    socket.emit('submit_vote', { username: username, team: teamName });
    
    // إخفاء الأزرار وإظهار رسالة النجاح بعد التصويت
    document.getElementById('vote-buttons-container').classList.add('hidden');
    document.getElementById('status-msg').classList.remove('hidden');
}

// ------------------------------------------------------------------
// 3. وظيفة إعادة التصويت (reVote)
// ------------------------------------------------------------------
function reVote() {
    // إظهار الأزرار مرة أخرى
    document.getElementById('vote-buttons-container').classList.remove('hidden');
    // إخفاء رسالة النجاح
    document.getElementById('status-msg').classList.add('hidden');
}

// ------------------------------------------------------------------
// 4. وظائف لوحة التحكم (الأدمن)
// ------------------------------------------------------------------

socket.on('update_results', (votes) => {
    updateAdminView(votes);
});

function updateAdminView(votes) {
    const resultsContainer = document.getElementById('results-container');
    
    // قائمة الخيارات المتاحة
    const activityNames = ["One Piece", "HXH", "Bleach", "Demon Slayer"]; 
    
    const shadowColors = {
        "One Piece": "shadow-red",
        "HXH": "shadow-green",
        "Bleach": "shadow-orange",
        "Demon Slayer": "shadow-purple"
    };

    // حساب الإجمالي
    let totalVotes = 0;
    for (const key in votes) {
        totalVotes += votes[key].length;
    }
    
    const totalEl = document.getElementById('total-votes');
    if(totalEl) totalEl.textContent = `إجمالي الأصوات: ${totalVotes}`;

    if (!resultsContainer) return;

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
                    <div class="vote-bar ${barColorClass}" style="width: ${result.percentage}%; height: 100%; border-radius: inherit; background-color: currentColor; opacity: 0.7;"></div>
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; text-align: left;">
                    ${voterNamesHtml}
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

function resetAll() {
    if (confirm("هل أنت متأكد من تصفير جميع الأصوات؟")) {
        socket.emit('reset_all');
    }
}

function deleteVoter(voterName, team) {
    if (confirm(`هل أنت متأكد من حذف صوت ${voterName}؟`)) {
        socket.emit('delete_voter', { voterName, team });
    }
}