document.addEventListener('DOMContentLoaded', () => {
    // 1. تحديد العناصر الأساسية
    const votingPage = document.getElementById('voting-page');
    const voteButtons = document.querySelectorAll('.vote-btn');
    const voterNameInput = document.getElementById('voter-name');
    const messages = document.getElementById('messages');

    if (!votingPage) return; // الخروج إذا لم تكن هذه صفحة التصويت

    // 2. دالة لعرض رسالة للمستخدم
    const displayMessage = (message, isError = false) => {
        messages.textContent = message;
        messages.style.color = isError ? '#ff6347' : '#4CAF50'; // أحمر للخطأ، أخضر للنجاح
        messages.classList.remove('hidden');
        setTimeout(() => {
            messages.classList.add('hidden');
        }, 5000);
    };

    // 3. دالة معالجة التصويت
    const handleVote = async (event) => {
        const team = event.currentTarget.getAttribute('data-vote');
        const voterName = voterNameInput.value.trim();

        if (!voterName) {
            displayMessage('الرجاء إدخال اسمك أولاً!', true);
            return;
        }

        if (!team) {
            displayMessage('حدث خطأ: لا يوجد فريق محدد.', true);
            return;
        }

        // تعطيل الأزرار لمنع التصويت المزدوج أثناء المعالجة
        voteButtons.forEach(btn => btn.disabled = true);
        
        displayMessage('جارٍ إرسال التصويت...');

        try {
            // إرسال البيانات إلى الخادم
            const response = await fetch('/submit-vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: voterName, team: team })
            });

            // قراءة الرد من الخادم
            const result = await response.json();

            if (response.ok) {
                // نجاح التصويت
                displayMessage(result.message || `تم تسجيل تصويتك لـ ${team} بنجاح!`);
                // هنا يمكنك إخفاء صفحة التصويت وإظهار رسالة شكر
                voterNameInput.value = ''; // مسح حقل الاسم
            } else {
                // فشل التصويت (مثل محاولة تصويت ثانية)
                displayMessage(result.error || 'حدث خطأ غير متوقع أثناء التصويت.', true);
            }

        } catch (error) {
            console.error('Fetch error:', error);
            displayMessage('فشل الاتصال بالخادم. حاول مرة أخرى.', true);
        } finally {
            // إعادة تفعيل الأزرار بعد الانتهاء
            voteButtons.forEach(btn => btn.disabled = false);
        }
    };

    // 4. ربط الأزرار بالدالة
    voteButtons.forEach(button => {
        button.addEventListener('click', handleVote);
    });

    // 5. وظيفة لفتح/إغلاق قوائم الفرق في صفحة info.html
    const teamItems = document.querySelectorAll('.item');
    teamItems.forEach(item => {
        item.addEventListener('click', () => {
            const list = item.querySelector('.team-members-list');
            const icon = item.querySelector('.toggle-icon');
            
            // إغلاق كل القوائم المفتوحة ما عدا القائمة الحالية
            teamItems.forEach(otherItem => {
                const otherList = otherItem.querySelector('.team-members-list');
                const otherIcon = otherItem.querySelector('.toggle-icon');
                if (otherList !== list && otherList.classList.contains('open')) {
                    otherList.classList.remove('open');
                    otherIcon.textContent = '+';
                }
            });

            // فتح أو إغلاق القائمة الحالية
            list.classList.toggle('open');
            if (list.classList.contains('open')) {
                icon.textContent = '-';
            } else {
                icon.textContent = '+';
            }
        });
    });
});