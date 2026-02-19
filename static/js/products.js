var API_URL = "https://kinetic-fp1n.onrender.com";
let allIngredients = [];
let newRecipe = []; // Тут храним состав нового блюда

document.addEventListener('DOMContentLoaded', () => {
    loadIngredients();
    loadDishes();
});

// --- 1. ИНГРЕДИЕНТЫ ---

async function loadIngredients() {
    const res = await fetch(`${API_URL}/dishes/ingredients/`);
    allIngredients = await res.json();
    
    // Рендер списка
    const list = document.getElementById('ingList');
    const select = document.getElementById('ingSelect');
    list.innerHTML = '';
    select.innerHTML = '<option value="">Оберіть продукт...</option>';
    
    allIngredients.forEach(ing => {
        // В список
        list.innerHTML += `
            <div class="list-row">
                <span>${ing.name} <span style="color:#666">(${ing.kcal} ккал)</span></span>
                <button class="btn btn-del" onclick="deleteIng(${ing.id})">×</button>
            </div>`;
        
        // В селект (для создания блюда)
        select.innerHTML += `<option value="${ing.id}">${ing.name}</option>`;
    });
}

async function createIngredient() {
    const data = {
        name: document.getElementById('iName').value,
        kcal: parseInt(document.getElementById('iKcal').value),
        protein: parseFloat(document.getElementById('iProt').value),
        fats: parseFloat(document.getElementById('iFats').value),
        carbs: parseFloat(document.getElementById('iCarb').value),
        sugar: parseFloat(document.getElementById('iSugar').value || 0),
        fiber: parseFloat(document.getElementById('iFiber').value || 0)
    };

    const res = await fetch(`${API_URL}/dishes/ingredients/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        alert("Продукт створено!");
        document.getElementById('ingForm').reset();
        loadIngredients();
    } else {
        alert("Помилка! Можливо, таке ім'я вже є.");
    }
}

async function deleteIng(id) {
    if(!confirm("Видалити цей інгредієнт?")) return;
    const res = await fetch(`${API_URL}/dishes/ingredients/${id}`, { method: 'DELETE' });
    if(res.ok) loadIngredients();
    else alert("Не можна видалити: цей продукт є в рецептах!");
}

// --- 2. БЛЮДА (РЕЦЕПТЫ) ---

function addIngToRecipe() {
    const select = document.getElementById('ingSelect');
    const weight = document.getElementById('ingWeight').value;
    const id = parseInt(select.value);
    
    if (!id || !weight) return;
    
    const name = select.options[select.selectedIndex].text;
    
    newRecipe.push({ ingredient_id: id, weight_g: parseInt(weight) });
    
    // Обновляем визуал
    document.getElementById('addedIngs').innerHTML += `<div>+ ${name} (${weight}г)</div>`;
    document.getElementById('ingWeight').value = '';
}

async function createDish() {
    const name = document.getElementById('dName').value;
    if (!name || newRecipe.length === 0) return alert("Введіть назву та додайте інгредієнти!");

    const data = {
        name: name,
        description: "Авторський рецепт",
        ingredients: newRecipe
    };

    const res = await fetch(`${API_URL}/dishes/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        alert("Страва створена!");
        newRecipe = [];
        document.getElementById('addedIngs').innerHTML = '';
        document.getElementById('dName').value = '';
        loadDishes();
    } else {
        alert("Помилка створення страви");
    }
}

async function loadDishes() {
    const res = await fetch(`${API_URL}/dishes/`);
    const data = await res.json();
    const list = document.getElementById('dishList');
    list.innerHTML = '';
    
    data.forEach(d => {
        list.innerHTML += `
            <div class="list-row">
                <span><b>${d.name}</b> <span style="color:#0a84ff">~${d.total_kcal} ккал</span></span>
                <button class="btn btn-del" onclick="deleteDish(${d.id})">×</button>
            </div>`;
    });
}

async function deleteDish(id) {
    if(!confirm("Видалити цей рецепт?")) return;
    await fetch(`${API_URL}/dishes/${id}`, { method: 'DELETE' });
    loadDishes();
}