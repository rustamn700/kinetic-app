var API_URL = "https://kinetic-fp1n.onrender.com";
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

let currentAIResult = null;
let currentAiData = null;
let GLOBAL_FOOD_DB = [];
let SELECTED_DATE = new Date();
let currentLang = localStorage.getItem('appLang') || 'ua';
let attachedFiles = []; 
let html5QrcodeScanner = null;
let aiStream = null;

// --- 1️⃣ ТАКТИЛЬНА ВІБРАЦІЯ (HAPTIC) ---
function vibrate(pattern = 50) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// --- 2️⃣ PWA БАННЕР ВСТАНОВЛЕННЯ ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('installBanner');
    if (localStorage.getItem('hideInstallBanner') !== 'true' && banner) {
        setTimeout(() => { banner.classList.add('active'); }, 3000); // Показуємо через 3 секунди
    }
});

function installPWA() {
    vibrate();
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('active');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    }
}

function dismissInstallBanner() {
    const banner = document.getElementById('installBanner');
    if(banner) banner.classList.remove('active');
    localStorage.setItem('hideInstallBanner', 'true');
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.classList.add('hidden');
    }, 1500); 

    
    initThemeIcon();
    applyLanguage(currentLang);
    updateDateDisplay();
    loadDashboardData();
    loadFoodDatabase();
    
    const input = document.getElementById('dishInput');
    const box = document.getElementById('suggestionsBox');

    if (input) {
        input.addEventListener('input', (e) => {
            updateSendButtonState();
            handleAutocomplete(e.target.value);
        });
    }

    document.addEventListener('click', (e) => {
        if (box && !e.target.closest('.input-wrapper')) {
            box.classList.remove('active');
        }
    });

    const weightInput = document.getElementById('rWeightInput');
    if(weightInput) {
        weightInput.addEventListener('input', recalculateResultCard);
    }

    const profileBtn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');

    if(profileBtn && dropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            dropdown.classList.toggle('active');
            const langSel = document.getElementById('langSelector');
            if(langSel) langSel.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== profileBtn) {
                dropdown.classList.remove('active');
            }
        });
    }
});

function toggleLangSelector() {
    const selector = document.getElementById('langSelector');
    const arrow = document.getElementById('langArrow');
    if (selector.style.display === 'none') {
        selector.style.display = 'flex';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        selector.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang);
    applyLanguage(lang);
    updateDateDisplay();
}

function applyLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
    document.querySelectorAll('.lang-circle-mini').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`lang-${lang}`);
    if(activeBtn) activeBtn.classList.add('active');
}

function checkAuth(res) {
    if (res.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function changeDate(offset) {
    SELECTED_DATE.setDate(SELECTED_DATE.getDate() + offset);
    updateDateDisplay();
    loadDashboardData();
}

function updateDateDisplay() {
    const display = document.getElementById('currentDateDisplay');
    const today = new Date();
    const d1 = new Date(SELECTED_DATE); d1.setHours(0,0,0,0);
    const d2 = new Date(today); d2.setHours(0,0,0,0);
    const t = translations[currentLang]; 

    if (d1.getTime() === d2.getTime()) {
        display.innerText = t.history_today || "Сьогодні";
    } else {
        const langMap = {'en': 'en-GB', 'ru': 'ru-RU', 'az': 'az-AZ', 'ua': 'uk-UA'};
        display.innerText = SELECTED_DATE.toLocaleDateString(langMap[currentLang] || 'uk-UA', { day: 'numeric', month: 'long' });
    }
}

function getFormattedDate() {
    const offset = SELECTED_DATE.getTimezoneOffset();
    const date = new Date(SELECTED_DATE.getTime() - (offset*60*1000));
    return date.toISOString().split('T')[0];
}

async function loadDashboardData() {
    const loader = document.getElementById('skeletonLoader');
    if(loader) {
        loader.style.display = 'flex';
        loader.classList.add('active');
        loader.style.opacity = '1';
    }
    
    try {
        // Promise.allSettled гарантує, що інтерфейс завантажиться, 
        // навіть якщо один із запитів до БД впаде
        await Promise.allSettled([
            updateHeroStats(),
            loadWeightChart(),
            loadDailyHistory(),
            loadWater()
        ]);
    } catch (e) {
        console.error("Помилка завантаження:", e);
    } finally {
        setTimeout(() => {
            if(loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.classList.remove('active');
                    loader.style.display = 'none'; // Жорстко ховаємо блок
                }, 300); 
            }
        }, 500); 
    }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// --- 3️⃣ САЛЮТ ПРИ ДОСЯГНЕННІ ЦІЛІ ---
async function updateHeroStats() {
    const token = localStorage.getItem('access_token');
    if(!token) return;

    try {
        const userRes = await fetch(`${API_URL}/auth/me`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if (!checkAuth(userRes)) return;

        if(userRes.ok) {
            const u = await userRes.json();
            const goal = u.daily_goal || 2500;

            if(document.getElementById('dropGoal')) document.getElementById('dropGoal').innerText = goal;
            if(document.getElementById('dropWeightDisplay')) document.getElementById('dropWeightDisplay').innerText = u.weight || '--';
            if(document.getElementById('dropName')) document.getElementById('dropName').innerText = u.email.split('@')[0];
            if(document.getElementById('dropEmail')) document.getElementById('dropEmail').innerText = u.email;
            
            const initials = u.email[0].toUpperCase();
            if(document.getElementById('dropInitials')) document.getElementById('dropInitials').innerText = initials;
            if(document.getElementById('navUserInitials')) document.getElementById('navUserInitials').innerText = initials;
            
            const dateStr = getFormattedDate();
            const mealsRes = await fetch(`${API_URL}/meals/stats?date=${dateStr}`, { 
                headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
            });

            if(mealsRes.ok) {
                const data = await mealsRes.json();
                const current = data.total || 0;
                animateValue('currentCals', 0, current, 1200);
                
                document.getElementById('heroProt').innerText = Math.round(data.protein || 0);
                document.getElementById('heroFat').innerText = Math.round(data.fats || 0);
                document.getElementById('heroCarb').innerText = Math.round(data.carbs || 0);

                const percentRaw = (current / goal) * 100;
                const percent = Math.min(percentRaw, 120);
                document.getElementById('percentText').innerText = Math.round(percentRaw) + '%';
                
                const circle = document.getElementById('heroProgress');
                if (circle) {
                    const circumference = 2 * Math.PI * 90;
                    circle.style.strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;
                    
                    if (percent >= 100) {
                        circle.style.stroke = "#30d158"; // Зелений, якщо досягли
                        
                        // Запускаємо конфетті, якщо сьогодні ще не було
                        const todayStr = getFormattedDate();
                        if (localStorage.getItem('confettiFired') !== todayStr && typeof confetti === 'function') {
                            confetti({
                                particleCount: 150, spread: 80, origin: { y: 0.6 },
                                colors: ['#30d158', '#0a84ff', '#ff9f0a', '#ffd60a'],
                                disableForReducedMotion: true
                            });
                            vibrate([100, 50, 100, 50, 100]); // Переможна вібрація!
                            localStorage.setItem('confettiFired', todayStr);
                        }
                    } else if (percent > 85) {
                        circle.style.stroke = "#ff9f0a"; 
                    } else {
                        circle.style.stroke = "#0a84ff"; 
                    }
                }
            }
        }
    } catch (e) { console.error(e); }
}

// --- 4️⃣ СВАЙП ДЛЯ ВИДАЛЕННЯ ЇЖІ ---
let touchStartX = 0;
let currentSwipedEl = null;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    if (!touchStartX) return;
    let currentX = e.touches[0].clientX;
    let diff = touchStartX - currentX;
    let el = e.currentTarget;

    // Свайп вліво (більше 40 пікселів)
    if (diff > 40) {
        if(currentSwipedEl && currentSwipedEl !== el) {
            currentSwipedEl.style.transform = 'translateX(0)';
        }
        el.style.transform = 'translateX(-80px)';
        currentSwipedEl = el;
    } 
    // Свайп вправо (закрити)
    else if (diff < -30) {
        el.style.transform = 'translateX(0)';
        if(currentSwipedEl === el) currentSwipedEl = null;
    }
}

async function loadDailyHistory() {
    const token = localStorage.getItem('access_token');
    try {
        const dateStr = getFormattedDate();
        const res = await fetch(`${API_URL}/meals/?date=${dateStr}`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if (!checkAuth(res)) return;

        if(res.ok) {
            const meals = await res.json();
            window.TODAY_MEALS = meals; 

            const fireIcon = document.getElementById('streakFire');
            if (meals.length > 0) { fireIcon.classList.add('active'); } 
            else { fireIcon.classList.remove('active'); }

            const list = document.getElementById('mealsList');
            list.innerHTML = '';
            
            if(meals.length === 0) {
                list.innerHTML = `
                    <div style="text-align:center; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">
                        <div style="font-size:48px; margin-bottom:12px;">🍽️</div>
                        <h4 style="color:white; margin-bottom:6px; font-size:18px;">Жодного запису</h4>
                        <p style="font-size:14px; color:#888;">Час щось з'їсти та записати!</p>
                    </div>`;
                return;
            }

            meals.slice().reverse().forEach((m, index) => {
                const badge = m.cuisine === 'Azerbaijani' ? '🇦🇿' : (m.cuisine === 'Ukrainian' ? '🇺🇦' : '');
                let timeIcon = '🍽️';
                let timeColor = 'rgba(255,255,255,0.05)';
                
                if (m.created_at) {
                    const hour = new Date(m.created_at).getHours();
                    if (hour >= 5 && hour < 12) { timeIcon = '🍳'; timeColor = 'rgba(255, 159, 10, 0.15)'; }
                    else if (hour >= 12 && hour < 17) { timeIcon = '🍲'; timeColor = 'rgba(48, 209, 88, 0.15)'; }
                    else { timeIcon = '🥗'; timeColor = 'rgba(10, 132, 255, 0.15)'; }
                }

                // 🔥 ВАЖЛИВО: Нова структура для Свайпу
                list.innerHTML += `
                    <div class="swipe-container">
                        <div class="swipe-action" onclick="vibrate(); deleteMeal(event, ${m.id})">🗑️</div>
                        <div class="swipe-content" onclick="openEditMealModal(${m.id})" ontouchstart="handleTouchStart(event)" ontouchmove="handleTouchMove(event)">
                            <div class="h-icon-box" style="background: ${timeColor};">${timeIcon}</div>
                            <div class="h-info">
                                <h4>${badge} ${m.name}</h4>
                                <p>
                                    <span class="h-grams">${m.grams} г</span>
                                    <span class="h-macros">Б:${Math.round(m.total_protein)} Ж:${Math.round(m.total_fats)} В:${Math.round(m.total_carbs)}</span>
                                </p>
                            </div>
                            <div class="h-right">
                                <span class="h-cal">${m.total_kcal} <small>ккал</small></span>
                            </div>
                        </div>
                    </div>`;
            });
        }
    } catch (e) { console.error(e); }
}

async function deleteMeal(event, id) {
    if(event) event.stopPropagation(); 
    if(!confirm("Видалити?")) {
        if(currentSwipedEl) currentSwipedEl.style.transform = 'translateX(0)';
        return;
    }
    const token = localStorage.getItem('access_token');
    await fetch(`${API_URL}/meals/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
    });
    updateHeroStats(); loadDailyHistory();
}

let currentEditMealId = null;

function openEditMealModal(id) {
    if(currentSwipedEl) {
        currentSwipedEl.style.transform = 'translateX(0)';
        currentSwipedEl = null;
        return; 
    }

    const meal = window.TODAY_MEALS.find(m => m.id === id);
    if (!meal) return;
    
    currentEditMealId = id;
    let cleanName = meal.name.replace(/🇦🇿 |🇺🇦 /g, ''); 
    let unit = 'г';
    if (cleanName.includes('(мл)')) { unit = 'мл'; cleanName = cleanName.replace(' (мл)', ''); }
    else if (cleanName.includes('(шт)')) { unit = 'шт'; cleanName = cleanName.replace(' (шт)', ''); }
    
    document.getElementById('editMealNameInput').value = cleanName;
    document.getElementById('editMealAmount').value = meal.grams;
    document.getElementById('editMealUnit').value = unit;
    
    document.getElementById('editMealModal').style.display = 'flex';
}

function closeEditMealModal() {
    document.getElementById('editMealModal').style.display = 'none';
    currentEditMealId = null;
}

async function saveMealEdit() {
    if (!currentEditMealId) return;
    
    const newName = document.getElementById('editMealNameInput').value.trim();
    const newAmount = parseFloat(document.getElementById('editMealAmount').value);
    const unit = document.getElementById('editMealUnit').value;

    if (!newName || isNaN(newAmount) || newAmount <= 0) return alert('Введіть коректні дані');

    const mealToEdit = window.TODAY_MEALS.find(m => m.id === currentEditMealId);
    if (!mealToEdit) return;

    const ratio = newAmount / mealToEdit.grams;
    let finalName = newName;
    if (unit === 'мл' && !finalName.toLowerCase().includes('мл')) finalName += ' (мл)';
    if (unit === 'шт' && !finalName.toLowerCase().includes('шт')) finalName += ' (шт)';

    const payload = {
        product_name: finalName,
        grams: newAmount, 
        total_kcal: Math.round(mealToEdit.total_kcal * ratio),
        total_protein: mealToEdit.total_protein * ratio,
        total_fats: mealToEdit.total_fats * ratio,
        total_carbs: mealToEdit.total_carbs * ratio,
        cuisine: mealToEdit.cuisine || "Updated",
        confidence: 1.0
    };

    const token = localStorage.getItem('access_token');
    const btn = document.querySelector('#editMealModal .btn-primary');
    btn.innerText = '⏳';

    try {
        const postRes = await fetch(`${API_URL}/meals/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify(payload)
        });

        if (postRes.ok) {
            await fetch(`${API_URL}/meals/${currentEditMealId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
            });
            closeEditMealModal();
            updateHeroStats();
            loadDailyHistory();
        } else {
            alert('Помилка оновлення');
        }
    } catch (e) { console.error(e); } 
    finally { btn.innerText = 'Зберегти'; }
}

// --- 📈 ОНОВЛЕНИЙ APPLE HEALTH ГРАФІК ВАГИ ---
async function loadWeightChart() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/weight/history`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        
        if (res.ok) {
            const data = await res.json();
            
            // Робимо красиві короткі дати (DD.MM) та лікуємо баг NaN
            const dates = data.map(d => {
                if (d.date && typeof d.date === 'string') {
                    const parts = d.date.split('-'); // Розбиваємо "YYYY-MM-DD"
                    if (parts.length === 3) {
                        return `${parseInt(parts[2])}.${parseInt(parts[1])}`; // Повертає "3.3" або "25.10"
                    }
                }
                return '';
            });
            const weights = data.map(d => d.weight);

            // 🔥 ДИНАМІЧНИЙ МАСШТАБ (Щоб графік не був плоскою лінією)
            const minWeight = Math.floor(Math.min(...weights)) - 1;
            const maxWeight = Math.ceil(Math.max(...weights)) + 1;

            const ctx = document.getElementById('weightChart').getContext('2d');
            
            // Соковитий градієнт
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(52, 199, 89, 0.2)'); // Apple Green прозорий
            gradient.addColorStop(1, 'rgba(52, 199, 89, 0)');

            if(window.myWeightChart) window.myWeightChart.destroy();
            
            window.myWeightChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Вага (кг)', 
                        data: weights, 
                        borderColor: '#34C759', 
                        backgroundColor: gradient,
                        borderWidth: 3, 
                        pointBackgroundColor: '#FFFFFF', 
                        pointBorderColor: '#34C759',
                        pointBorderWidth: 2, 
                        pointRadius: 4, 
                        pointHoverRadius: 6, 
                        fill: true, 
                        tension: 0.4 // 🔥 Робить лінію плавною кривою!
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8E8E93', font: { size: 11, weight: '600' } } },
                        y: { 
                            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, 
                            border: { display: false }, 
                            ticks: { color: '#8E8E93', font: { size: 11, weight: '600' } }, 
                            min: minWeight, // Застосовуємо динамічний мінімум
                            max: maxWeight  // Застосовуємо динамічний максимум
                        }
                    },
                    plugins: { 
                        legend: { display: false },
                        tooltip: { backgroundColor: '#FFFFFF', titleColor: '#8E8E93', bodyColor: '#1C1C1E', bodyFont: { size: 14, weight: 'bold' }, padding: 12, cornerRadius: 12, displayColors: false, borderColor: 'rgba(0,0,0,0.05)', borderWidth: 1, callbacks: { label: function(context) { return context.parsed.y + ' кг'; } } }
                    },
                    interaction: { intersect: false, mode: 'index' }
                }
            });
        }
    } catch (e) { console.error("Помилка графіка:", e); }
}

// --- ⚖️ ЛОГІКА ДОДАВАННЯ ВАГИ ПО ДАТАХ ---
function openWeightModal() {
    // Показуємо користувачу, за яку дату він вносить вагу (Беремо з твого календаря)
    const dateStr = SELECTED_DATE.toLocaleDateString(currentLang === 'ua' ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long' });
    document.getElementById('weightModalDate').innerText = dateStr;
    
    // Підставляємо поточну відому вагу в інпут
    const currentWeight = document.getElementById('dropWeightDisplay').innerText;
    document.getElementById('weightLogInput').value = currentWeight !== '--' ? currentWeight : ''; 
    
    document.getElementById('weightLogModal').style.display = 'flex';
}

function closeWeightModal() {
    document.getElementById('weightLogModal').style.display = 'none';
}

async function saveDailyWeight() {
    const token = localStorage.getItem('access_token');
    const weightVal = parseFloat(document.getElementById('weightLogInput').value);
    const dateStr = getFormattedDate(); // Беремо дату з твого календаря (на яку перемкнувся юзер)

    if (isNaN(weightVal) || weightVal <= 30) { 
        alert("Будь ласка, введіть коректну вагу"); 
        return; 
    }

    const btn = document.querySelector('#weightLogModal .btn-primary');
    btn.innerText = '⏳';

    try {
        // Відправляємо на бекенд (передаємо і вагу, і ДАТУ)
        const res = await fetch(`${API_URL}/weight/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify({ weight: weightVal, date: dateStr }) 
        });

        if (res.ok) {
            closeWeightModal();
            loadWeightChart(); // Миттєво перемальовуємо графік
            
            // Оновлюємо цифру в інтерфейсі (Бенто-картка)
            if(document.getElementById('dropWeightDisplay')) document.getElementById('dropWeightDisplay').innerText = weightVal;
        } else {
            alert("Помилка збереження ваги. Перевірте з'єднання.");
        }
    } catch (e) { 
        console.error(e); 
    } finally {
        btn.innerText = 'Зберегти';
    }
}

async function loadFoodDatabase() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/meals/database`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if(res.ok) GLOBAL_FOOD_DB = await res.json();
    } catch(e) { console.error(e); }
}

function handleAutocomplete(query) {
    const box = document.getElementById('suggestionsBox');
    const val = query.trim().toLowerCase();
    if(val.length === 0) { box.classList.remove('active'); return; }
    const matches = GLOBAL_FOOD_DB.filter(f => f.name.toLowerCase().includes(val)).slice(0, 5);
    if (matches.length > 0) {
        box.innerHTML = '';
        matches.forEach(m => {
            let flag = m.cuisine === 'Ukrainian' ? '🇺🇦 ' : (m.cuisine === 'Azerbaijani' ? '🇦🇿 ' : '');
            let icon = m.icon || '🍽️';
            if (m.cuisine === 'Custom') icon = '⭐️'; 
            
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<span>${flag}${icon} ${m.name}</span> <small style="color:#666">${m.calories} ккал</small>`;
            div.onclick = () => selectSuggestion(m);
            box.appendChild(div);
        });
        box.classList.add('active');
    } else { box.classList.remove('active'); }
}

function selectSuggestion(item) {
    document.getElementById('dishInput').value = item.name;
    document.getElementById('suggestionsBox').classList.remove('active');
    updateSendButtonState();
    openResultCardFromDB(item);
}

function openResultCardFromDB(data) {
    const card = document.getElementById('resultCard');
    card.style.display = 'block';
    currentAIResult = {
        dish_name: data.name, calories: data.calories, protein: data.protein, fat: data.fat, carbs: data.carbs,
        estimated_grams: 100, unit: data.unit || 'г', weight_per_piece: data.weight_per_piece || 0,
        ingredients: data.ingredients || "Склад не вказано", cuisine: data.cuisine
    };
    let prefix = data.cuisine === 'Ukrainian' ? '🇺🇦 ' : (data.cuisine === 'Azerbaijani' ? '🇦🇿 ' : '');
    document.getElementById('rName').innerText = prefix + data.name;
    document.getElementById('rTime').innerText = new Date().toLocaleTimeString().slice(0,5);
    
    document.getElementById('rWeightInput').value = 100;
    currentAIResult.unit = data.unit || 'г';
    recalculateResultCard();
    document.getElementById('actionMenu').classList.remove('active');
    document.getElementById('btnPlus').classList.remove('active');
    card.scrollIntoView({behavior: 'smooth'});
}

function recalculateResultCard() {
    if(!currentAIResult) return;
    const userQty = parseFloat(document.getElementById('rWeightInput').value) || 0;
    let ratio = 0;
    if (currentAIResult.unit === 'шт') {
        const pieceWeight = currentAIResult.weight_per_piece || 0;
        ratio = (pieceWeight > 0 ? userQty * pieceWeight : userQty * 100) / 100;
    } else { ratio = userQty / 100; }
    
    const k = Math.round(currentAIResult.calories * ratio);
    const p = (currentAIResult.protein * ratio).toFixed(1);
    const f = (currentAIResult.fat * ratio).toFixed(1);
    const c = (currentAIResult.carbs * ratio).toFixed(1);
    
    document.getElementById('rKcal').innerText = k;
    document.getElementById('rProt').innerText = Math.round(p);
    document.getElementById('rFats').innerText = Math.round(f);
    document.getElementById('rCarb').innerText = Math.round(c);
    
    document.getElementById('barProt').style.height = Math.min(p * 2, 60) + 'px';
    document.getElementById('barFat').style.height = Math.min(f * 2, 60) + 'px';
    document.getElementById('barCarb').style.height = Math.min(c, 60) + 'px';
}

async function triggerAISearch() {
    const input = document.getElementById('dishInput');
    const query = input.value.trim();
    const btn = document.getElementById('aiBtn');
    
    if (attachedFiles && attachedFiles.length > 0) {
        const fileToAnalyze = attachedFiles[0]; 
        const originalBtn = btn.innerHTML; 
        btn.innerHTML = '<div class="spinner" style="width:14px; height:14px; border:2px solid white; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>';
        
        await analyzeImageFile(fileToAnalyze);
        
        clearAllImages();
        input.value = '';
        document.getElementById('actionMenu').classList.remove('active');
        document.getElementById('btnPlus').classList.remove('active');
        btn.innerHTML = originalBtn; 
        updateSendButtonState();
        return; 
    }

    if (query.length === 0) return;
    
    const originalBtn = btn.innerHTML; 
    btn.innerHTML = "🔍";
    
    const match = GLOBAL_FOOD_DB.find(f => f.name.toLowerCase() === query.toLowerCase());
    if (match) {
        openResultCardFromDB(match);
    } else {
        openResultCardFromDB({ name: query, calories: 0, protein: 0, fat: 0, carbs: 0, unit: 'г', ingredients: "Не знайдено в базі.", cuisine: 'Other', weight_per_piece: 0 });
    }
    
    input.value = ''; 
    document.getElementById('actionMenu').classList.remove('active');
    document.getElementById('btnPlus').classList.remove('active');
    btn.innerHTML = originalBtn; 
    updateSendButtonState();
}

async function addToDiary() {
    if (!currentAIResult) return;
    const token = localStorage.getItem('access_token');
    let userQty = parseFloat(document.getElementById('rWeightInput').value);
    let finalGrams = userQty;
    if (currentAIResult.unit === 'шт' && currentAIResult.weight_per_piece > 0) {
        finalGrams = Math.round(userQty * currentAIResult.weight_per_piece);
    }
    const kcal = parseInt(document.getElementById('rKcal').innerText);
    const prot = parseFloat(document.getElementById('rProt').innerText);
    const fats = parseFloat(document.getElementById('rFats').innerText);
    const carbs = parseFloat(document.getElementById('rCarb').innerText);
    const rawName = document.getElementById('rName').innerText.replace(/🇦🇿 |🇺🇦 /g, '');

    const payload = {
        product_name: rawName, grams: finalGrams, total_kcal: kcal,
        total_protein: prot, total_fats: fats, total_carbs: carbs,
        cuisine: currentAIResult.cuisine || "Unknown", confidence: 1.0, ingredients: currentAIResult.ingredients
    };
    
    try {
        const res = await fetch(`${API_URL}/meals/`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify(payload)
        });
        if (!checkAuth(res)) return;
        if(res.ok) { closeResultCard(); updateHeroStats(); loadDailyHistory(); }
        else { alert("Помилка збереження"); }
    } catch(e) { console.error(e); }
}

function closeResultCard() {
    document.getElementById('resultCard').style.display = 'none';
    currentAIResult = null;
    document.getElementById('dishInput').value = '';
}

function updateSendButtonState() {
    const input = document.getElementById('dishInput');
    const btn = document.getElementById('aiBtn');
    if (input.value.trim().length > 0 || (typeof attachedFiles !== 'undefined' && attachedFiles.length > 0)) {
        btn.classList.add('ready'); btn.style.opacity = "1"; btn.style.pointerEvents = "auto";
    } else { btn.classList.remove('ready'); btn.style.opacity = "0.5"; btn.style.pointerEvents = "none"; }
}

function triggerCamera() { if(attachedFiles.length >= 10) return; toggleActionMenu(); document.getElementById('cameraInput').click(); }
function triggerGallery() { if(attachedFiles.length >= 10) return; toggleActionMenu(); document.getElementById('galleryInput').click(); }
function handleImageSelect(input) { if (input.files) { Array.from(input.files).forEach(f => attachedFiles.push(f)); renderPreviews(); input.value=''; updateSendButtonState(); } }

function renderPreviews() {
    const box = document.getElementById('imagePreview'); 
    const list = document.getElementById('previewList');
    if (attachedFiles.length === 0) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden'); list.innerHTML = '';
    attachedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = e => {
            const div = document.createElement('div'); div.className = 'thumb-wrapper';
            div.innerHTML = `<img src="${e.target.result}" class="thumb-img"><div class="btn-remove-one" onclick="vibrate(); removeOneImage(${index})">×</div>`;
            list.appendChild(div);
        }
        reader.readAsDataURL(file);
    });
}

function removeOneImage(i) { attachedFiles.splice(i, 1); renderPreviews(); updateSendButtonState(); }
function clearAllImages() { attachedFiles = []; renderPreviews(); updateSendButtonState(); }
function toggleActionMenu() { document.getElementById('actionMenu').classList.toggle('active'); document.getElementById('btnPlus').classList.toggle('active'); }
function openCatalogFromMenu() { toggleActionMenu(); if(window.openCatalogRoot) openCatalogRoot(); }

// --- 5️⃣ АНІМАЦІЯ ВОДИ ---
async function loadWater() {
    const token = localStorage.getItem('access_token');
    const dateStr = getFormattedDate();
    try {
        const res = await fetch(`${API_URL}/meals/water/today?date=${dateStr}`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('waterCount').innerText = data.total_ml;
            
            // Анімація колби
            const fillPercentage = Math.min((data.total_ml / 2500) * 100, 100); 
            const fillLayer = document.getElementById('waterCardFill');
            if (fillLayer) fillLayer.style.height = `${fillPercentage}%`;
        }
    } catch (e) { console.error(e); }
}

async function addWater(amount) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_URL}/meals/water`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify({ amount: amount })
        });
        if (res.ok) { loadWater(); }
    } catch (e) { console.error(e); }
}

function openWaterModal() {
    const currentVal = document.getElementById('waterCount').innerText;
    document.getElementById('waterInput').value = currentVal;
    document.getElementById('waterModal').style.display = 'flex';
}

function closeWaterModal() {
    document.getElementById('waterModal').style.display = 'none';
}

async function saveWaterEdit() {
    const token = localStorage.getItem('access_token');
    const newVal = parseInt(document.getElementById('waterInput').value);
    const dateStr = getFormattedDate();

    if (isNaN(newVal) || newVal < 0) { alert("Введіть коректне число"); return; }

    try {
        const res = await fetch(`${API_URL}/meals/water?date=${dateStr}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify({ amount: newVal })
        });
        if (res.ok) { closeWaterModal(); loadWater(); } 
        else { alert("Помилка збереження"); }
    } catch (e) { console.error(e); }
}

function openCreateProductModal() {
    toggleActionMenu();
    document.getElementById('createProductModal').style.display = 'flex';
}

function closeCreateProductModal() {
    document.getElementById('createProductModal').style.display = 'none';
    document.getElementById('cpName').value = '';
    document.getElementById('cpKcal').value = '';
    document.getElementById('cpProt').value = '';
    document.getElementById('cpFat').value = '';
    document.getElementById('cpCarb').value = '';
}

async function saveCustomProduct() {
    const name = document.getElementById('cpName').value;
    const kcal = parseInt(document.getElementById('cpKcal').value);
    const prot = parseFloat(document.getElementById('cpProt').value) || 0;
    const fat = parseFloat(document.getElementById('cpFat').value) || 0;
    const carb = parseFloat(document.getElementById('cpCarb').value) || 0;
    const barcode = document.getElementById('cpBarcode').value || null;

    if (!name || isNaN(kcal)) { alert("Введіть назву та калорії!"); return; }

    const payload = { name: name, calories: kcal, protein: prot, fat: fat, carbs: carb, barcode: barcode };
    const token = localStorage.getItem('access_token');
    
    try {
        const res = await fetch(`${API_URL}/meals/custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeCreateProductModal();
            document.getElementById('cpBarcode').value = ""; 
            await loadFoodDatabase(); 
            alert(`Продукт "${name}" збережено!`);
        } else { alert("Помилка створення"); }
    } catch (e) { console.error(e); }
}

function selectGender(element, value) {
    document.querySelectorAll('#genderSelector .segment-option').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('profGender').value = value;
}

function selectActivity(element, value) {
    document.querySelectorAll('#activitySelector .activity-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('profActivity').value = value;
}

function selectGoal(element, value) {
    document.querySelectorAll('#goalSelector .goal-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('profGoalType').value = value;
}

function initProfileUI(userData) {
    const gender = userData.gender || 'male';
    const genderEl = document.querySelector(`.segment-option[data-value="${gender}"]`);
    if(genderEl) selectGender(genderEl, gender);

    const act = userData.activity_level || 1.2;
    const actCards = document.querySelectorAll('.activity-card');
    if (actCards.length >= 4) {
        if(act < 1.3) selectActivity(actCards[0], 1.2);
        else if(act < 1.5) selectActivity(actCards[1], 1.375);
        else if(act < 1.7) selectActivity(actCards[2], 1.55);
        else selectActivity(actCards[3], 1.725);
    }

    const goal = userData.goal_type || 'maintain';
    const goalEl = document.querySelector(`.goal-card[data-goal="${goal}"]`);
    if(goalEl) selectGoal(goalEl, goal);
    
    document.getElementById('profAge').value = userData.age || 25;
    document.getElementById('profWeight').value = userData.weight || 70;
    document.getElementById('profHeight').value = userData.height || 175;
}

async function openProfileModal() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_URL}/auth/me`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if(res.ok) {
            const u = await res.json();
            initProfileUI(u);
            document.getElementById('profileModal').style.display = 'flex';
        }
    } catch(e) { console.error(e); }
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

async function saveProfile() {
    const token = localStorage.getItem('access_token');
    const weightVal = parseFloat(document.getElementById('profWeight').value);
    
    const payload = {
        gender: document.getElementById('profGender').value,
        age: parseInt(document.getElementById('profAge').value),
        weight: weightVal,
        height: parseInt(document.getElementById('profHeight').value),
        activity_level: parseFloat(document.getElementById('profActivity').value),
        goal_type: document.getElementById('profGoalType').value
    };

    try {
        const res = await fetch(`${API_URL}/auth/update-profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify(payload)
        });
        
        await fetch(`${API_URL}/weight/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify({ weight: weightVal })
        });

        if (res.ok) {
            const data = await res.json();
            alert(`Вашу нову ціль розраховано: ${data.new_goal} ккал`);
            closeProfileModal();
            updateHeroStats(); 
            loadWeightChart(); 
        } else { alert("Помилка збереження"); }
    } catch(e) { console.error(e); }
}

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = '/login.html';
}

function startScanner() {
    document.getElementById('scannerModal').style.display = 'flex';
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start(
        { facingMode: "environment" }, config, onScanSuccess, (err) => {}
    ).catch(err => {
        alert("Помилка камери: " + err);
        stopScanner();
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('scannerModal').style.display = 'none';
            html5QrcodeScanner.clear();
        }).catch(err => console.error(err));
    } else { document.getElementById('scannerModal').style.display = 'none'; }
}

async function onScanSuccess(decodedText, decodedResult) {
    vibrate(200);
    stopScanner();
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
        const data = await res.json();
        if (data.status === 1) {
            openCreateProductModal();
            const p = data.product;
            document.getElementById('cpName').value = p.product_name || "Новий продукт";
            document.getElementById('cpKcal').value = Math.round(p.nutriments['energy-kcal_100g'] || 0);
            document.getElementById('cpProt').value = p.nutriments['proteins_100g'] || 0;
            document.getElementById('cpFat').value = p.nutriments['fat_100g'] || 0;
            document.getElementById('cpCarb').value = p.nutriments['carbohydrates_100g'] || 0;
        } else {
            alert("Продукт не знайдено, але ви можете додати його самі!");
            openCreateProductModal();
            document.getElementById('cpName').placeholder = "Введіть назву (напр. Beta Tea Strawberry)";
        }
    } catch (e) { alert("Помилка мережі"); }
}

async function analyzeImageFile(file) {
    const resultModal = document.getElementById('aiResultModal');
    const contentBox = document.getElementById('aiResultContent');
    resultModal.style.display = 'flex'; 

    contentBox.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <div class="skeleton sk-circle" style="width:80px; height:80px; margin:0 auto 20px;"></div>
            <h3 style="color:white;">Аналізую...</h3>
            <p style="color:#888;">Нейромережа розглядає фото 🧐</p>
        </div>
    `;

    const formData = new FormData();
    formData.append('file', file, file.name || 'image.jpg');

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/meals/analyze-photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: formData
        });

        const data = await res.json();
        
        if (data.limit_reached) {
            contentBox.innerHTML = `
                <div style="text-align:center; padding: 30px;">
                    <div style="font-size: 50px; margin-bottom: 20px;">🛑</div>
                    <h3 style="color:#ff453a; margin-bottom: 10px;">Ліміт вичерпано</h3>
                    <p style="color:#ccc; line-height: 1.5;">На сьогодні все. Спробуйте завтра!</p>
                    <button onclick="closeAiResult()" class="btn-text" style="margin-top: 20px;">Зрозуміло</button>
                </div>
            `;
            return;
        }

        if (data.error) {
            contentBox.innerHTML = `<p style="color: #ff6b6b; text-align: center; padding: 20px;">${data.error}</p>`;
            setTimeout(() => closeAiResult(), 3000);
        } else { renderAiResults(data); vibrate(); }
    } catch (e) {
        alert("Помилка з'єднання: " + e);
        closeAiResult();
    }
}

async function triggerCameraAI() {
    const modal = document.getElementById('aiCameraModal');
    const video = document.getElementById('cameraFeed');
    document.getElementById('actionMenu').classList.remove('active');
    document.getElementById('btnPlus').classList.remove('active');

    updateCameraLimits(); 

    try {
        aiStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        video.srcObject = aiStream;
        modal.style.display = 'flex';
    } catch (err) { alert("Не вдалося відкрити камеру: " + err); }
}

function closeAiCamera() {
    const modal = document.getElementById('aiCameraModal');
    const video = document.getElementById('cameraFeed');
    if (aiStream) aiStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    modal.style.display = 'none';
}

async function updateCameraLimits() {
    const badge = document.getElementById('photoLimitBadge');
    const text = document.getElementById('limitText');
    const token = localStorage.getItem('access_token');
    if(!text) return;

    try {
        const res = await fetch(`${API_URL}/meals/limits`, { 
            headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS }
        });
        if (res.ok) {
            const data = await res.json();
            text.innerText = `${data.remaining} з ${data.limit}`;
            if (data.remaining === 0) { badge.classList.add('low'); text.innerText = "Ліміт 0"; } 
            else { badge.classList.remove('low'); }
        }
    } catch (e) { console.error(e); }
}

async function takeAiSnapshot() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
        closeAiCamera();
        await analyzeImageFile(blob);
    }, 'image/jpeg', 0.9);
}

function renderAiResults(data) {
    const contentBox = document.getElementById('aiResultContent');
    contentBox.innerHTML = ''; 

    if (!data || !data.items || data.items.length === 0) {
        contentBox.innerHTML = `<p style="text-align: center; color: #aaa; padding: 20px;">AI не знайшов їжі на фото 🤷‍♂️</p>`;
        return;
    }

    currentAiData = data;

    if (data.summary_text) {
        contentBox.innerHTML += `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 15px; font-style: italic; color: #ccc; font-size: 14px; border-left: 3px solid #4CAF50;">
                "${data.summary_text}"
            </div>
        `;
    }

    let html = '<div class="ai-items-list" style="max-height: 300px; overflow-y: auto;">';
    data.items.forEach((item, index) => {
        const kcal = item.calories || 0;
        const grams = item.grams || 100;
        const name = item.name || "Продукт";
        const p = item.protein || 0;
        const f = item.fat || 0;
        const c = item.carbs || 0;

        html += `
            <div class="ai-item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px; color: white; margin-bottom: 4px;">${name}</div>
                    <div style="font-size: 13px; color: #aaa;">
                        <span style="color: #fff;">${grams}г</span> • ${kcal} ккал
                        <div style="font-size: 11px; color: #666; margin-top: 2px;">
                            (Б: ${p} • Ж: ${f} • В: ${c})
                        </div>
                    </div>
                </div>
                <button onclick="vibrate(); addAiItemToDiary(${index})" 
                        class="btn-add-ai"
                        style="background: transparent; color: #4CAF50; border: 1px solid #4CAF50; border-radius: 50%; width: 36px; height: 36px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    +
                </button>
            </div>
        `;
    });
    html += '</div>';

    if (data.items.length > 1) {
        html += `
            <button onclick="vibrate(); addAllAiItems()" 
                    style="width: 100%; margin-top: 20px; padding: 14px; background: #4CAF50; color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);">
                Додати все разом (${data.total.calories} ккал)
            </button>
        `;
    }
    contentBox.innerHTML += html;
}

async function addAiItemToDiary(index) {
    if (!currentAiData || !currentAiData.items[index]) return;
    const item = currentAiData.items[index];
    const token = localStorage.getItem('access_token');
    
    const btn = document.querySelectorAll('.btn-add-ai')[index];
    btn.innerHTML = '<div class="spinner" style="width:14px; height:14px; border:2px solid #4CAF50; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>';

    const payload = {
        product_name: item.name, grams: item.grams, total_kcal: item.calories,
        total_protein: item.protein, total_fats: item.fat, total_carbs: item.carbs,
        cuisine: "AI", confidence: 1.0
    };

    try {
        const res = await fetch(`${API_URL}/meals/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            btn.innerHTML = '✓'; btn.style.background = '#4CAF50'; btn.style.color = 'white';
            updateHeroStats(); loadDailyHistory();
        } else { alert("Помилка збереження"); btn.innerHTML = '+'; }
    } catch (e) { console.error(e); btn.innerHTML = '+'; }
}

async function addAllAiItems() {
    if (!currentAiData) return;
    const btn = document.querySelector('button[onclick="addAllAiItems()"]');
    btn.innerText = "Зберігаю..."; btn.disabled = true;

    for (let i = 0; i < currentAiData.items.length; i++) {
        await addAiItemToDiary(i);
    }
    btn.innerText = "Готово!";
    setTimeout(() => { closeAiResult(); closeAiCamera(); }, 1000);
}

function closeAiResult() {
    document.getElementById('aiResultModal').style.display = 'none';
}

async function enableNotifications() {
    if (!("Notification" in window)) {
        alert("Ваш браузер не підтримує сповіщення");
        return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
        localStorage.setItem('notifications_enabled', 'true');
        alert("Сповіщення увімкнено!");
    }
}

// =========================================
// 💎 NEO PROFILE SHEET LOGIC
// =========================================

function openProfileSheet() {
    vibrate(15); // Очень короткий премиальный отклик
    document.getElementById('profileSheetBackdrop').classList.add('active');
    
    // Включаем эффект глубины для главного экрана
    document.body.classList.add('sheet-open');
    const mainCont = document.querySelector('.main-container');
    const nav = document.querySelector('.glass-nav');
    if(mainCont) mainCont.classList.add('stacked');
    if(nav) nav.classList.add('stacked');
}

function closeProfileSheet(e) {
    // Закрываем только если кликнули по фону, а не по самой карточке
    if (e && e.target.id !== 'profileSheetBackdrop') return;
    
    vibrate(10);
    document.getElementById('profileSheetBackdrop').classList.remove('active');
    
    // Возвращаем главный экран на место
    document.body.classList.remove('sheet-open');
    const mainCont = document.querySelector('.main-container');
    const nav = document.querySelector('.glass-nav');
    if(mainCont) mainCont.classList.remove('stacked');
    if(nav) nav.classList.remove('stacked');
}

function toggleNeoLangSelector() {
    vibrate(15);
    const sel = document.getElementById('neoLangSelector');
    const arrow = document.getElementById('neoLangArrow');
    if(sel.style.display === 'none') {
        sel.style.display = 'flex';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        sel.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// =========================================
// 🌗 ТЕМНА/СВІТЛА ТЕМА (DARK MODE TOGGLE)
// =========================================

function initThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    vibrate(15);
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = current === 'light' ? 'dark' : 'light';
    
    // Змінюємо тему
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    // Змінюємо іконку
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = nextTheme === 'dark' ? '☀️' : '🌙';
    
    // Оновлюємо кольори графіка, якщо він існує
    if (window.myWeightChart) {
        loadWeightChart();
    }
}