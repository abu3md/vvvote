// public/script.js

const socket = io();

// 🔑 كلمة سر الأدمن للدخول
const ADMIN_PASSWORD = 'admin'; 

// ------------------------------------------------------------------
// 1. وظيفة تسجيل الدخول (login)
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

    localStorage.setItem('currentUser', username);

    document.getElementById('login-page').classList.add('hidden');

    if (password === ADMIN_PASSWORD) {
        // ✅ دخول كأدمن
        document.getElementById('admin-page').classList.remove('hidden');
        document.getElementById('voting-page').classList.add('hidden');
        
        setupDownloadLink(); // إظهار زر تحميل السجل
    } else {
        // 👤 دخول كمستخدم عادي
        document.getElementById('voting-page').classList.remove('hidden');
        document.getElementById('admin-page').classList.add('hidden'); 
        
        // إظهار أزرار التصويت (التصويت مفتوح)
        document.getElementById('vote-buttons-container').classList.remove('hidden');
        document.getElementById('closed-message').classList.add('hidden');
    }
}

// إضافة زر تحميل السجل في صفحة الأدمن
function setupDownloadLink() {
    const adminHeader = document.querySelector('.admin-header');
    if (!document.getElementById('download-btn')) {
        const downloadBtn = document.createElement('a');
        downloadBtn.id = 'download-btn';
        downloadBtn.href = `/download-log?key=${ADMIN_PASSWORD}`;
        downloadBtn.className = 'glass-button';
        downloadBtn.style.marginLeft = '10px';
        downloadBtn.style.fontSize = '0.9rem';
        downloadBtn.style.textDecoration = 'none';
        downloadBtn.innerHTML = '📥 تحميل Excel';
        adminHeader.appendChild(downloadBtn);
    }
}

// ------------------------------------------------------------------
// 2. وظيفة التصويت
// ------------------------------------------------------------------
function vote(teamName) {
    const username = localStorage.getItem('currentUser') || document.getElementById('username').value;
    
    if (!username) {
        alert("يرجى تسجيل الدخول مرة أخرى.");
        location.reload();
        return;
    }

    socket.emit('submit_vote', { username: username, team: teamName });
    
    document.getElementById('vote-buttons-container').classList.add('hidden');
    document.getElementById('status-msg').classList.remove('hidden');
}

// إعادة التصويت
function reVote() {
    document.getElementById('vote-buttons-container').classList.remove('hidden');
    document.getElementById('status-msg').classList.add('hidden');
}

// ------------------------------------------------------------------
// 3. وظائف الأدمن وتحديث النتائج
// ------------------------------------------------------------------
socket.on('update_results', (votes) => {
    updateAdminView(votes);
});

function updateAdminView(votes) {
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
                <h4 style="margin: 0;">${result.activity} (${result.count}) - ${result.percentage}%</h4>
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
    if (confirm(`حذف صوت ${voterName}؟`)) {
        socket.emit('delete_voter', { voterName, team });
    }
}