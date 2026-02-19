// 👇 ВАЖНО: Адрес NGROK
const API_URL = "https://kinetic-fp1n.onrender.com";

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('error');
    const btn = document.querySelector('.btn-primary');

    if(!email || !password) {
        errorElement.innerText = "Введіть email та пароль";
        return;
    }

    // Блокируем кнопку, чтобы понять, что процесс идет
    btn.innerText = "Вход...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            // 👇 ДОБАВЛЯЕМ HEADER, НО ТОЛЬКО ДЛЯ NGROK
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = 'dashboard.html'; // Убрал /static/, обычно они в одной папке
        } else {
            errorElement.innerText = "Помилка входу! Перевірте дані.";
            btn.innerText = "Увійти";
            btn.disabled = false;
        }
    } catch (e) {
        errorElement.innerText = "Помилка мережі: " + e;
        btn.innerText = "Увійти";
        btn.disabled = false;
    }
}