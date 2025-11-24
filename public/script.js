const socket = io();

// العناصر الموجودة في صفحة vote.html فقط
const loginPage = document.getElementById('login-page');
const votingPage = document.getElementById('voting-page');
const adminPage = document.getElementById('admin-page');
const usernameInput = document.getElementById('username');

// تأكد من وجود العناصر قبل الوصول إليها
const statusMsg = document.getElementById('status-msg');
const buttonsGrid = document.querySelector('.buttons-grid');

let currentUser = "";

// عند الدخول إلى vote.html
document.addEventListener('DOMContentLoaded', () => {
    // إخفاء أقسام التصويت والأدمن عند تحميل الصفحة
    if (votingPage) votingPage.classList.add('hidden');
    if (adminPage) adminPage.classList.add('hidden');
});

function login() {
    const name = usernameInput.value.trim();
    if (!name || !loginPage) return alert("الرجاء إدخال الاسم.");

    currentUser = name;
    loginPage.classList.add('hidden');

    if (name === "1212") {
        // الأدمن يذهب مباشرة للوحة التحكم
        if(adminPage) adminPage.classList.remove('hidden');
    } else {
        // المستخدم العادي يذهب لصفحة التصويت
        if(votingPage) votingPage.classList.remove('hidden');
        
        // التحقق مما إذا كان قد صوت سابقاً
        if (localStorage.getItem('hasVoted') === 'true') {
            showVotedState();
        }
    }
}

function vote(animeName) {
    if (localStorage.getItem('hasVoted') === 'true') return;

    socket.emit('castVote', { anime: animeName, user: currentUser });
    localStorage.setItem('hasVoted', 'true');
    showVotedState();
}

function showVotedState() {
    if (buttonsGrid) buttonsGrid.classList.add('hidden');
    if (statusMsg) statusMsg.classList.remove('hidden');
}

function reVote() {
    if (confirm("هل تريد حذف صوتك السابق والتصويت من جديد؟")) {
        socket.emit('retractVote', currentUser);
        localStorage.removeItem('hasVoted');
        if (statusMsg) statusMsg.classList.add('hidden');
        if (buttonsGrid) buttonsGrid.classList.remove('hidden');
    }
}

function resetAll() {
    if (confirm("تحذير: هل أنت متأكد من تصفير جميع الأصوات؟")) {
        socket.emit('resetAllVotes');
    }
}

function deleteUser(uName) {
    if (confirm(`هل تريد حذف صوت المستخدم: ${uName}؟`)) {
        socket.emit('deleteUserVote', uName);
    }
}

// ------------------------------------------
// منطق Socket.IO (لصفحة الأدمن)
// ------------------------------------------

socket.on('updateVotes', (votes) => {
    // يعمل فقط إذا كان المستخدم الحالي هو الأدمن
    if (currentUser !== "1212" || !adminPage) return;

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
        
        let barColor = '#ccc';
        if(item.anime === 'Naruto') barColor = '#ffeb3b';
        if(item.anime === 'One Piece') barColor = '#f44336';
        if(item.anime === 'HXH') barColor = '#00ff00';
        if(item.anime === 'Bleach') barColor = '#ff9800';

        const card = document.createElement('div');
        card.className = 'result-card';

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

socket.on('forceResetLocal', () => {
    localStorage.removeItem('hasVoted');
    if (currentUser && currentUser !== "1212") {
        if (statusMsg) statusMsg.classList.add('hidden');
        if (buttonsGrid) buttonsGrid.classList.remove('hidden');
        alert("قام الأدمن بتصفير الأصوات، يمكنك التصويت مجدداً.");
    }
});

socket.on('userVoteDeleted', (targetUser) => {
    if (currentUser === targetUser) {
        localStorage.removeItem('hasVoted');
        if (statusMsg) statusMsg.classList.add('hidden');
        if (buttonsGrid) buttonsGrid.classList.remove('hidden');
        alert("تم إلغاء تصويتك من قبل الإدارة، يمكنك التصويت مجدداً.");
    }
});