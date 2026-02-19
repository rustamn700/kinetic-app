const API_URL = "https://kinetic-fp1n.onrender.com";

async function calculateDish() {
    const input = document.getElementById('dishInput');
    const query = input.value.trim();
    
    if (!query) return alert("Введіть назву страви!");

    const btn = document.querySelector('.btn-calc');
    btn.innerText = "Рахуємо...";

    try {
        // GET запрос с параметром query
        const res = await fetch(`${API_URL}/dishes/calculate?query=${query}`);
        
        if (!res.ok) {
            btn.innerText = "Рассчитать";
            throw new Error("Страва не знайдена");
        }

        const data = await res.json();
        renderResult(data);
        btn.innerText = "Розрахувати";

    } catch (e) {
        alert("Страву не знайдено! Спробуйте: Плов, Гречка, Омлет");
        btn.innerText = "Розрахувати";
    }
}

function renderResult(data) {
    const card = document.getElementById('resultCard');
    
    // 1. Заполняем тексты
    document.getElementById('rName').innerText = data.dish_name;
    document.getElementById('rWeight').innerText = `${data.total_weight} г`;
    document.getElementById('rKcal').innerText = data.total_kcal;
    
    document.getElementById('rProt').innerText = `${data.total_protein} г`;
    document.getElementById('rFats').innerText = `${data.total_fats} г`;
    document.getElementById('rCarb').innerText = `${data.total_carbs} г`;
    document.getElementById('rSugar').innerText = `${data.total_sugar} г`;

    // 2. Список ингредиентов
    const list = document.getElementById('ingList');
    list.innerHTML = '<div style="font-size:12px; color:#888; margin-bottom:10px;">СКЛАД:</div>';
    data.ingredients.forEach(ing => {
        list.innerHTML += `
            <div class="ing-item">
                <span>${ing.name}</span>
                <span>${ing.weight_g} г</span>
            </div>
        `;
    });

    // 3. Показываем карточку
    card.style.display = 'block';
    // Небольшая задержка для анимации (CSS transition требует времени после display:block)
    requestAnimationFrame(() => {
        card.classList.add('active');
        
        // 4. Анимация полосок (Проценты условные, от 50г макс)
        setBar('barProt', data.total_protein);
        setBar('barFats', data.total_fats);
        setBar('barCarb', data.total_carbs);
    });
}

function setBar(id, val) {
    // Допустим, 50г - это 100% полоски для визуализации
    let percent = (val / 50) * 100; 
    if (percent > 100) percent = 100;
    document.getElementById(id).style.width = `${percent}%`;
}