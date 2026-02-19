// 👇 ВАЖНО: Ставим адрес NGROK, а не 192.168...
const API_URL = "https://kinetic-fp1n.onrender.com";

async function register() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;

    if (!email || !password) {
        alert("Заповніть всі поля");
        return;
    }

    if (password !== confirm) {
        alert("Паролі не співпадають");
        return;
    }

    const btn = document.querySelector('.btn-primary');
    const oldText = btn.innerText;
    btn.innerText = "⏳...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // 👇 ДОБАВИЛИ КЛЮЧ, ЧТОБЫ ТЕЛЕФОН ПРОПУСТИЛ
                'ngrok-skip-browser-warning': 'true' 
            },
            body: JSON.stringify({ 
                email: email, 
                password: password 
            })
        });

        if (response.ok) {
            alert("Акаунт створено! Увійдіть.");
            window.location.href = 'login.html';
        } else {
            const data = await response.json();
            alert("Помилка: " + (data.detail || "Щось пішло не так"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Помилка з'єднання з сервером");
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}