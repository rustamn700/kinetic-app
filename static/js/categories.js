const API_URL_CAT = '/catalog';

// 🔥 ОБОВ'ЯЗКОВИЙ ЗАГОЛОВОК ДЛЯ NGROK
const NGROK_HEADERS_CAT = {
    'ngrok-skip-browser-warning': 'true'
};

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

// Робимо функцію доступною глобально
window.openCatalogRoot = openCatalogRoot;
window.closeCatalogModal = closeCatalogModal;

// 1. ЗАВАНТАЖЕННЯ КАТЕГОРІЙ
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    const token = localStorage.getItem('access_token');
    
    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center;color:#fff;">Завантаження...</div>';

    try {
        const res = await fetch(`${API_URL_CAT}/catalog/categories`, {
             headers: { 
                 'Authorization': `Bearer ${token}`,
                 ...NGROK_HEADERS_CAT 
             }
        });
        
        if (!res.ok) throw new Error(`Помилка: ${res.status}`);
        
        const cats = await res.json();
        
        grid.innerHTML = '';
        cats.forEach(c => {
            const div = document.createElement('div');
            div.className = 'category-card'; // Проверь, чтобы класс совпадал с CSS
            div.onclick = () => openCategoryView(c.id, c.name);
            div.innerHTML = `
                <div class="cat-icon emoji-icon" style="font-size:30px;">${c.icon || '📁'}</div>
                <div class="cat-name" style="margin-top:5px;">${c.name}</div>
            `;
            grid.appendChild(div);
        });
    } catch (e) { 
        console.error(e);
        grid.innerHTML = '<div style="text-align:center;color:red;">Помилка</div>';
    }
}

// 2. ВІДКРИТТЯ ГОЛОВНОГО КАТАЛОГУ
function openCatalogRoot() {
    const modal = document.getElementById('catalogModal');
    if (modal) {
        // 1. Сначала делаем видимым блок
        modal.style.display = 'flex'; 
        
        // 2. Даем небольшую паузу и добавляем класс active (чтобы сработала анимация выезда)
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        document.getElementById('viewRoot').style.display = 'block';
        document.getElementById('viewProducts').style.display = 'none';
        
        const title = document.getElementById('sheetTitle');
        if(title) title.innerText = 'Каталог';
        
        const btnBack = document.getElementById('btnBackCat');
        if(btnBack) btnBack.style.display = 'none';
    }
}

function closeCatalogModal() {
    const modal = document.getElementById('catalogModal');
    if (modal) {
        // Убираем класс (окно уезжает вниз)
        modal.classList.remove('active');
        
        // Ждем пока уедет, потом скрываем
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// 3. ПЕРЕХІД В КАТЕГОРІЮ
async function openCategoryView(id, name) {
    document.getElementById('viewRoot').style.display = 'none';
    const prodView = document.getElementById('viewProducts');
    prodView.style.display = 'flex';
    prodView.style.flexDirection = 'column';
    
    document.getElementById('sheetTitle').innerText = name;
    document.getElementById('btnBackCat').style.display = 'block';
    
    loadSubcategories(id);
    loadProducts(id);
}

// 4. ПОВЕРНЕННЯ НАЗАД
window.backToRoot = function() {
    document.getElementById('viewProducts').style.display = 'none';
    document.getElementById('viewRoot').style.display = 'block';
    
    document.getElementById('sheetTitle').innerText = 'Каталог';
    document.getElementById('btnBackCat').style.display = 'none';
}

async function loadSubcategories(parentId) {
    const scroll = document.getElementById('subcatsScroll');
    const token = localStorage.getItem('access_token');
    try {
        // 🔥 ВИПРАВЛЕНО: Прибрав /catalog
        const res = await fetch(`${API_URL_CAT}/catalog/categories/${parentId}/subcategories`, { 
        headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS_CAT }
    });
        const subs = await res.json();
        
        scroll.innerHTML = '';
        const allBtn = document.createElement('div');
        allBtn.className = 'sub-pill active';
        allBtn.innerText = 'Всі';
        allBtn.onclick = function() { filterBySub(this, parentId); };
        scroll.appendChild(allBtn);

        subs.forEach(s => {
            const pill = document.createElement('div');
            pill.className = 'sub-pill';
            pill.innerText = s.name;
            pill.onclick = function() { filterBySub(this, s.id); };
            scroll.appendChild(pill);
        });
    } catch(e) { console.error(e); }
}

function filterBySub(el, catId) {
    document.querySelectorAll('.sub-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    loadProducts(catId);
}

async function loadProducts(catId) {
    const list = document.getElementById('sheetProductsList');
    list.innerHTML = '<div style="text-align:center; padding:20px; color:#666">Завантаження...</div>';
    
    const token = localStorage.getItem('access_token');
    try {
        // 🔥 ВИПРАВЛЕНО: Прибрав /catalog
        const res = await fetch(`${API_URL_CAT}/catalog/categories/${catId}/products`, { 
        headers: { 'Authorization': `Bearer ${token}`, ...NGROK_HEADERS_CAT }
    });
        const products = await res.json();
        
        list.innerHTML = '';
        
        if (products.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#666">Пусто</div>';
            return;
        }

        products.forEach(p => {
            const div = document.createElement('div');
            div.className = 'sheet-item'; 
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); width: 100%;";
            
            div.innerHTML = `
                <div class="sheet-info">
                    <h4 style="margin:0; font-size:16px;">${p.name}</h4>
                    <p style="margin:0; color:#888; font-size:13px;">${p.calories} ккал • Б:${p.protein} Ж:${p.fat}</p>
                </div>
                <button class="btn-add-sheet" style="background:#4CAF50; border:none; color:white; width:30px; height:30px; border-radius:50%; font-size:20px; cursor:pointer;">+</button>
            `;
            
            div.onclick = () => selectProductForAdd(p.name, p.calories, p.protein, p.fat, p.carbs, p.cuisine);
            list.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

function selectProductForAdd(name, cal, prot, fat, carb, cuisine) {
    closeCatalogModal();
    
    const data = { 
        name: name, 
        calories: cal, 
        protein: prot, 
        fat: fat, 
        carbs: carb, 
        cuisine: cuisine || 'Catalog'
    };
    
    if(window.openResultCardFromDB) { 
        window.openResultCardFromDB(data); 
    } else {
        console.error("Функція openResultCardFromDB не знайдена в dashboard.js");
    }
}