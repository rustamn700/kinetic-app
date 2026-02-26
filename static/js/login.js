var API_URL = "https://kinetic-fp1n.onrender.com";

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('error');
    const btn = document.querySelector('.btn-primary');

    // Очищаємо попередні помилки перед новою спробою
    if (errorElement) {
        errorElement.innerText = "";
        errorElement.style.display = "none";
    }

    // 1. ПЕРЕВІРКА НА ПОРОЖНІ ПОЛЯ
    if(!email || !password) {
        showError("Введіть email та пароль");
        return;
    }

    // 2. ПЕРЕВІРКА ФОРМАТУ EMAIL
    if (!email.includes('@') || !email.includes('.')) {
        showError("Введіть правильний Email (наприклад: name@gmail.com)");
        return;
    }

    // Блокуємо кнопку, щоб уникнути подвійних кліків
    btn.innerText = "Вхід...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = 'dashboard.html'; 
        } else {
            showError("Невірний логін або пароль!");
            btn.innerText = "Увійти";
            btn.disabled = false;
        }
    } catch (e) {
        showError("Помилка мережі. Перевірте інтернет.");
        btn.innerText = "Увійти";
        btn.disabled = false;
    }

    // Допоміжна функція для виводу помилки
    function showError(msg) {
        if (errorElement) {
            errorElement.innerText = msg;
            errorElement.style.display = "block";
            // Якщо у тебе в CSS немає кольору для помилки, додамо його тут:
            errorElement.style.color = "#ff453a"; 
            errorElement.style.background = "rgba(255, 69, 58, 0.1)";
            errorElement.style.padding = "10px";
            errorElement.style.borderRadius = "8px";
            errorElement.style.marginBottom = "15px";
            errorElement.style.fontSize = "14px";
            errorElement.style.textAlign = "center";
        } else {
            alert(msg);
        }
    }
}