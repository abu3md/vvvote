const socket = io();

// عناصر الصفحة
const introPage = document.getElementById('intro-page'); // شاشة البداية الجديدة
const loginPage = document.getElementById('login-page');
const votingPage = document.getElementById('voting-page');
const adminPage = document.getElementById('admin-page');
const usernameInput = document.getElementById('username');
const thankYouMsg = document.getElementById('thank-you-msg');
const buttonsGrid = document.querySelector('.buttons-grid');

let currentUser = "";

// إظهار صفحة تسجيل الدخول عند الضغط على زر "Next"
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
        // إذا كان قد صوت سابقاً، عطل الأزرار
        if (localStorage.getItem('hasVoted') === 'true') {
            disableButtons();
            thankYouMsg.classList.remove('hidden');
            thankYouMsg.innerText = "لقد قمت بالتصويت سابقاً";
        }
    }
}

function vote(animeName) {
    if (localStorage.getItem('hasVoted') === 'true') return;

    // إرسال الصوت للسيرفر
    socket.emit('castVote', { anime: animeName, user: currentUser });

    // حفظ الحالة محلياً لمنع التصويت مرة أخرى
    localStorage.setItem('hasVoted', 'true');
    
    disableButtons();
    thankYouMsg.classList.remove('hidden');
}

function disableButtons() {
    const btns = document.querySelectorAll('.vote-btn');
    btns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.7"; // أقل شفافية ليعطي إحساس بالتعطيل
        btn.style.cursor = "not-allowed";
        btn.style.backgroundColor = "rgba(0, 188, 212, 0.1)"; // لون أزرق فاتح وشفاف جداً
        btn.style.borderColor = "rgba(0, 188, 212, 0.2)"; // حدود باهتة
    });
}

// --- منطق صفحة الأدمن ---

socket.on('updateVotes', (votes) => {
    // يتم التحديث فقط إذا كنت في صفحة الأدمن
    if (currentUser !== "1212") return;

    const resultsContainer = document.getElementById('results-container');
    const totalVotesElem = document.getElementById('total-votes');
    resultsContainer.innerHTML = '';

    let total = 0;
    let sortedVotes = [];

    // تحويل الكائن إلى مصفوفة للترتيب
    for (const [anime, voters] of Object.entries(votes)) {
        total += voters.length;
        sortedVotes.push({ anime, voters, count: voters.length });
    }

    // الترتيب من الأعلى للأسفل
    sortedVotes.sort((a, b) => b.count - a.count);

    totalVotesElem.innerText = `إجمالي الأصوات: ${total}`;

    sortedVotes.forEach(item => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        
        const card = document.createElement('div');
        card.className = 'result-card glass-effect'; // إضافة تأثير Glass للكارد
        
        // لون شريط التقدم موحد الآن
        let barColor = '#00bcd4'; 

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>${item.anime}</strong>
                <span>${item.count} صوت (${percentage.toFixed(1)}%)</span>
            </div>
            <div class="bar-container">
                <div class="bar-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
            </div>
            <div class="voters-list">
                <strong>المصوتون:</strong><br>
                ${item.voters.length > 0 ? item.voters.join(', ') : 'لا يوجد'}
            </div>
        `;

        // ميزة الضغط لإظهار الأسماء
        card.addEventListener('click', () => {
            const list = card.querySelector('.voters-list');
            list.style.display = list.style.display === 'block' ? 'none' : 'block';
        });

        resultsContainer.appendChild(card);
    });
});