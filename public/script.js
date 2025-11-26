// (كود الواجهة الأمامية - public/script.js)

const socket = io(); 

// ------------------------------------------------------------------
// وظيفة الدخول (المستخدم العادي والأدمن)
// ------------------------------------------------------------------
function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('admin-password'); 
    const loginPage = document.getElementById('login-page');
    const votingPage = document.getElementById('voting-page');
    const adminPage = document.getElementById('admin-page');
    
    const username = usernameInput.value.trim();
    const password = passwordInput ? passwordInput.value.trim() : ''; 

    if (!username) {
        alert('الرجاء إدخال اسم المستخدم.');
        return;
    }

    // 1. حالة الأدمن 
    if (username.toLowerCase() === 'admin') {
        
        socket.emit('admin_login', { username: username, password: password }, (response) => {
            if (response.success) {
                loginPage.classList.add('hidden');
                votingPage.classList.add('hidden'); 
                adminPage.classList.remove('hidden');
                updateAdminResults(response.votes); 
            } else {
                alert('كلمة السر غير صحيحة للإدمن! (تذكر: Samer#1212)');
            }
        });
        return; 
    }

    // 2. حالة المستخدم العادي
    
    localStorage.setItem('currentUsername', username);
    
    loginPage.classList.add('hidden');
    adminPage.classList.add('hidden'); 
    votingPage.classList.remove('hidden');
    
    // عند الدخول، قم بتشغيل منطق إيقاف التصويت
    checkVotingBlockStatus(); 
}

// ------------------------------------------------------------------
// وظيفة التصويت
// ------------------------------------------------------------------
function vote(team) {
    const username = localStorage.getItem('currentUsername');
    if (!username) {
        alert('الرجاء تسجيل الدخول أولاً.');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('voting-page').classList.add('hidden');
        return;
    }

    // إرسال التصويت إلى الخادم
    socket.emit('new_vote', { username: username, team: team });

    // إظهار رسالة "تم التصويت"
    document.querySelector('.buttons-grid').classList.add('hidden');
    const statusMsg = document.getElementById('status-msg');
    statusMsg.classList.remove('hidden');
    statusMsg.innerHTML = 'تم تسجيل صوتك. شكراً لك! <button onclick="reVote()">تصويت مرة أخرى</button>';
}

// ------------------------------------------------------------------
// وظيفة إعادة التصويت (إذا سمحت الإدارة)
// ------------------------------------------------------------------
function reVote() {
    document.querySelector('.buttons-grid').classList.remove('hidden');
    document.getElementById('status-msg').classList.add('hidden');
}

// ------------------------------------------------------------------
// وظائف الأدمن
// ------------------------------------------------------------------

function resetAll() {
    if (confirm("هل أنت متأكد من تصفير جميع الأصوات؟ (سيتم حفظها في سجل المحذوفات)")) {
        socket.emit('reset_votes');
    }
}

function deleteVote(username) {
    if (confirm(`هل أنت متأكد من حذف تصويت المستخدم: ${username}؟ (سيتم حفظه في سجل المحذوفات)`)) {
        socket.emit('delete_vote', username);
    }
}

// ------------------------------------------------------------------
// معالجة البيانات القادمة من الخادم
// ------------------------------------------------------------------
socket.on('connect', () => {
    console.log('Connected to server via Socket.IO');
});

socket.on('update_results', (votes) => {
    if (!document.getElementById('admin-page').classList.contains('hidden')) {
        updateAdminResults(votes);
    }
});

function updateAdminResults(votes) {
    const resultsContainer = document.getElementById('results-container');
    const totalVotesElement = document.getElementById('total-votes');
    resultsContainer.innerHTML = '';
    
    const teamCounts = {};
    const totalCount = Object.keys(votes).length;

    totalVotesElement.textContent = `إجمالي الأصوات: ${totalCount}`;

    for (const user in votes) {
        const team = votes[user];
        if (!teamCounts[team]) {
            teamCounts[team] = { count: 0, voters: [] };
        }
        teamCounts[team].count++;
        teamCounts[team].voters.push(user);
    }

    for (const team in teamCounts) {
        const data = teamCounts[team];
        const percentage = totalCount > 0 ? (data.count / totalCount) * 100 : 0;

        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <h3>${team} (${data.count} أصوات)</h3>
            <div class="bar-container" style="margin-bottom: 10px;">
                <div style="width: ${percentage}%; background-color: #ffd700; height: 100%; border-radius: 4px;"></div>
            </div>
            <div class="voters-list" style="text-align: right;">
                ${data.voters.map(user => 
                    `<span class="voter-name" onclick="deleteVote('${user}')">${user}</span>`
                ).join('')}
            </div>
        `;
        resultsContainer.appendChild(resultCard);
    }
}

// ------------------------------------------------------------------
// وظيفة التحكم في حالة الإيقاف المؤقت (كما طلبت)
// ------------------------------------------------------------------
function checkVotingBlockStatus() {
    const votingPage = document.getElementById('voting-page');
    const buttonsGrid = document.querySelector('.buttons-grid');
    const statusMsg = document.getElementById('status-msg');
    
    if (votingPage && !votingPage.classList.contains('hidden')) {
        
        // 🛑 منطق إيقاف التصويت حالياً
        
        if (buttonsGrid) {
            buttonsGrid.classList.add('hidden'); // إخفاء الأزرار
        }
        
        if (statusMsg) {
            statusMsg.classList.remove('hidden'); // إظهار رسالة الحالة
            statusMsg.innerHTML = `
                <h2 style="color:#ffd700; font-size: 1.8rem; margin-bottom: 5px;">التصويت متوقف حالياً</h2>
                <p style="font-size: 1.2rem; margin-top: 0; color: #fff;">سيتم فتح التصويت الساعة **11 مساءً** اليوم.</p>
            `;
        }
        // ----------------------------------------------------------
    }
}

// ------------------------------------------------------------------
// تهيئة عند تحميل الصفحة
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('currentUsername');
    
    if (username && username.toLowerCase() !== 'admin') {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('voting-page').classList.remove('hidden');
        
        // استدعاء دالة الإيقاف المؤقت عند تحميل الصفحة
        checkVotingBlockStatus();
    }
});