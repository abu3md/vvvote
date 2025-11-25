// (هذا هو كود الواجهة الأمامية - public/script.js)

// إعداد اتصال Socket.io
// يجب التأكد من أن ملف socket.io.js مُضمَّن في HTML: <script src="/socket.io/socket.io.js"></script>
const socket = io(); 

// ------------------------------------------------------------------
// وظيفة الدخول (المستخدم العادي والأدمن)
// ------------------------------------------------------------------
function login() {
    // جلب العناصر الأساسية
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('admin-password'); 
    const loginPage = document.getElementById('login-page');
    const votingPage = document.getElementById('voting-page');
    const adminPage = document.getElementById('admin-page');
    
    // جلب القيم
    const username = usernameInput.value.trim();
    const password = passwordInput ? passwordInput.value.trim() : ''; 

    if (!username) {
        alert('الرجاء إدخال اسم المستخدم.');
        return;
    }

    // 1. حالة الأدمن (التحقق من كلمة السر عبر الخادم)
    if (username.toLowerCase() === 'admin') {
        
        // إرسال طلب تحقق إلى الخادم
        socket.emit('admin_login', { username: username, password: password }, (response) => {
            if (response.success) {
                // النجاح: إظهار لوحة الأدمن
                loginPage.classList.add('hidden');
                votingPage.classList.add('hidden'); 
                adminPage.classList.remove('hidden');
                
                // تحديث النتائج فوراً
                updateAdminResults(response.votes); 
            } else {
                alert('كلمة السر غير صحيحة للإدمن! (تذكر: Samer#1212)');
            }
        });
        return; 
    }

    // 2. حالة المستخدم العادي (الدخول مباشرةً)
    
    // حفظ اسم المستخدم محليًا
    localStorage.setItem('currentUsername', username);
    
    // إخفاء صفحة الدخول وإظهار صفحة التصويت
    loginPage.classList.add('hidden');
    adminPage.classList.add('hidden'); 
    votingPage.classList.remove('hidden');

    // (هنا يمكنك استدعاء دالة للتحقق مما إذا كان المستخدم قد صوت سابقاً)
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

    // إخفاء أزرار التصويت وعرض رسالة الحالة
    document.getElementById('buttons-grid').classList.add('hidden');
    document.getElementById('status-msg').classList.remove('hidden');
}

// ------------------------------------------------------------------
// وظيفة إعادة التصويت (إذا سمحت الإدارة)
// ------------------------------------------------------------------
function reVote() {
    document.getElementById('buttons-grid').classList.remove('hidden');
    document.getElementById('status-msg').classList.add('hidden');
    // ملاحظة: قد تحتاج إلى إرسال طلب للخادم لحذف التصويت القديم هنا إذا لم يكن مسموحاً بتغييره
}

// ------------------------------------------------------------------
// وظائف الأدمن
// ------------------------------------------------------------------

function resetAll() {
    if (confirm("هل أنت متأكد من تصفير جميع الأصوات؟ لا يمكن التراجع عن هذا الإجراء.")) {
        socket.emit('reset_votes');
    }
}

function deleteVote(username) {
    if (confirm(`هل أنت متأكد من حذف تصويت المستخدم: ${username}؟`)) {
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
    // تحديث النتائج في لوحة الأدمن (إذا كانت مفتوحة)
    if (!document.getElementById('admin-page').classList.contains('hidden')) {
        updateAdminResults(votes);
    }
    // تحديث عرض التصويت الحالي للمستخدم (إذا كانت لديك هذه الوظيفة)
});

// وظيفة تحديث عرض النتائج في لوحة الأدمن
function updateAdminResults(votes) {
    const resultsContainer = document.getElementById('results-container');
    const totalVotesElement = document.getElementById('total-votes');
    resultsContainer.innerHTML = '';
    
    const teamCounts = {};
    const totalCount = Object.keys(votes).length;

    totalVotesElement.textContent = `إجمالي الأصوات: ${totalCount}`;

    // 1. فرز الأصوات حسب الفريق
    for (const user in votes) {
        const team = votes[user];
        if (!teamCounts[team]) {
            teamCounts[team] = { count: 0, voters: [] };
        }
        teamCounts[team].count++;
        teamCounts[team].voters.push(user);
    }

    // 2. عرض النتائج
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
// تهيئة عند تحميل الصفحة (لإظهار/إخفاء الصفحات بناءً على حالة المستخدم)
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('currentUsername');
    
    // إذا كان المستخدم قد سجل الدخول سابقاً (كمستخدم عادي فقط)
    if (username && username.toLowerCase() !== 'admin') {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('voting-page').classList.remove('hidden');
    }
    
    // ملاحظة: لا يمكننا استعادة حالة الأدمن بدون إعادة إدخال كلمة السر.
});