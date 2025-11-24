const socket = io();

const introPage = document.getElementById('intro-page');
const loginPage = document.getElementById('login-page');
const votingPage = document.getElementById('voting-page');
const adminPage = document.getElementById('admin-page');
const usernameInput = document.getElementById('username');
const statusMsg = document.getElementById('status-msg');
const buttonsGrid = document.querySelector('.buttons-grid');

let currentUser = "";

// 1. التنقل بين الصفحات
function showLoginPage() {
    introPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
}

function login() {
    const name = usernameInput.value.trim();
    if (!name) return alert("الرجاء إدخال الاسم");

    currentUser = name;
    loginPage.classList.add('hidden');

    if (name === "1212") {
        adminPage.classList.remove('hidden');
    } else {
        votingPage.classList.remove('hidden');
        // التحقق مما إذا كان المستخدم قد صوت
        if (localStorage.getItem('hasVoted') === 'true') {
            showVotedState();
        }
    }
}

// 2. منطق التصويت
function vote(animeName) {
    if (localStorage.getItem('hasVoted') === 'true') return;

    socket.emit('castVote', { anime: animeName, user: currentUser });
    localStorage.setItem('hasVoted', 'true');
    showVotedState();
}

// إخفاء الأزرار وإظهار رسالة الشكر وزر إعادة التصويت
function showVotedState() {
    buttonsGrid.classList.add('hidden');
    statusMsg.classList.remove('hidden');
}

// 3. إعادة التصويت (للمستخدم)
function reVote() {
    if (confirm("هل تريد حذف صوتك السابق والتصويت من جديد؟")) {
        // إبلاغ السيرفر بحذف الصوت
        socket.emit('retractVote', currentUser);
        
        // إعادة الواجهة للوضع الافتراضي
        localStorage.removeItem('hasVoted');
        statusMsg.classList.add('hidden');
        buttonsGrid.classList.remove('hidden');
    }
}

// --- منطق الأدمن ---

// تصفير الكل
function resetAll() {
    if (confirm("تحذير: هل أنت متأكد من تصفير جميع الأصوات؟")) {
        socket.emit('resetAllVotes');
    }
}

// حذف مستخدم محدد (يتم استدعاؤها عند الضغط على الاسم)
function deleteUser(uName) {
    if (confirm(`هل تريد حذف صوت المستخدم: ${uName}؟`)) {
        socket.emit('deleteUserVote', uName);
    }
}

// --- استقبال تحديثات السيرفر ---

socket.on('updateVotes', (votes) => {
    // تحديث صفحة الأدمن فقط
    if (currentUser !== "1212") return;

    const resultsContainer = document.getElementById('results-container');
    const totalVotesElem = document.getElementById('total-votes');
    resultsContainer.innerHTML = '';

    let total = 0;
    let sortedVotes = [];

    for (const [anime, voters] of Object.entries(votes)) {
        total += voters.length;
        sortedVotes.push({ anime, voters, count: voters.length });
    }

    sortedVotes.sort((a, b) => b.count - a.count);
    totalVotesElem.innerText = `إجمالي الأصوات: ${total}`;

    sortedVotes.forEach(item => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        
        // تحديد لون البار حسب الأنمي
        let barColor = '#ccc';
        if(item.anime === 'Naruto') barColor = '#ffeb3b'; // أصفر
        if(item.anime === 'One Piece') barColor = '#f44336'; // أحمر
        if(item.anime === 'HXH') barColor = '#00ff00'; // أخضر
        if(item.anime === 'Bleach') barColor = '#ff9800'; // برتقالي

        const card = document.createElement('div');
        card.className = 'result-card';

        // إنشاء قائمة الأسماء القابلة للضغط
        let votersHtml = item.voters.map(v => 
            `<span class="voter-name" onclick="deleteUser('${v}')">${v}</span>`
        ).join(' ');

        if (item.voters.length === 0) votersHtml = '<span style="color:#777">لا يوجد مصوتون</span>';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong style="color:${barColor}; font-size:1.1rem;">${item.anime}</strong>
                <span>${item.count} (${percentage.toFixed(1)}%)</span>
            </div>
            <div class="bar-container" style="background:rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden;">
                <div style="width: ${percentage}%; height:100%; background-color: ${barColor}; transition: width 0.5s;"></div>
            </div>
            <div style="margin-top:10px; font-size:0.85rem; text-align:right;">
                <strong>المصوتون (اضغط للحذف):</strong><br>
                <div style="margin-top:5px; line-height:1.6;">${votersHtml}</div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
});

// إذا قام الأدمن بتصفير الكل، نعيد المستخدمين للصفحة الأولى
socket.on('forceResetLocal', () => {
    localStorage.removeItem('hasVoted');
    if (currentUser && currentUser !== "1212") {
        statusMsg.classList.add('hidden');
        buttonsGrid.classList.remove('hidden');
        alert("قام الأدمن بتصفير الأصوات، يمكنك التصويت مجدداً.");
    }
});

// إذا قام الأدمن بحذف صوت المستخدم الحالي
socket.on('userVoteDeleted', (targetUser) => {
    if (currentUser === targetUser) {
        localStorage.removeItem('hasVoted');
        statusMsg.classList.add('hidden');
        buttonsGrid.classList.remove('hidden');
        alert("تم إلغاء تصويتك من قبل الإدارة، يمكنك التصويت مجدداً.");
    }
});