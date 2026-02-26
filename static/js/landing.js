var API_URL = "https://kinetic-fp1n.onrender.com";

async function register() {
    // Зверни увагу: тут id відповідають твоєму HTML
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    const errorElement = document.getElementById('error');
    const btn = document.querySelector('.btn-primary');

    // Очищаємо старі помилки
    if (errorElement) {
        errorElement.innerText = "";
        errorElement.style.display = "none";
    }

    // --- 🛡️ СТРОГІ ПЕРЕВІРКИ ---
    if (!email || !password || !confirmPassword) {
        showError("Будь ласка, заповніть всі поля!");
        return;
    }

    // --- 🛡️ ЖОРСТКА ПЕРЕВІРКА НА GMAIL ---
    if (!email.endsWith('@gmail.com')) {
        showError("Будь ласка, використовуйте пошту @gmail.com");
        return;
    }
    
    if (password.length < 8) {
        showError("Пароль занадто короткий! Мінімум 8 символів.");
        return;
    }

    if (password !== confirmPassword) {
        showError("Паролі не співпадають!");
        return;
    }
    // --- КІНЕЦЬ ПЕРЕВІРОК ---

    btn.innerText = "Реєстрація...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ email: email, password: password }) 
        });

        if (response.ok) {
            alert("Реєстрація успішна! Тепер ви можете увійти.");
            window.location.href = 'login.html';
        } else {
            const errorData = await response.json();
            showError(errorData.detail || "Помилка реєстрації! Можливо, email вже зайнятий.");
            btn.innerText = "Зареєструватися";
            btn.disabled = false;
        }
    } catch (e) {
        showError("Помилка мережі. Перевірте інтернет.");
        btn.innerText = "Зареєструватися";
        btn.disabled = false;
    }

    // Допоміжна функція для красивого виводу помилки
    function showError(msg) {
        if (errorElement) {
            errorElement.innerText = msg;
            errorElement.style.display = "block";
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