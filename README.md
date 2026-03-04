# ⚡ Kinetic Fitness App

**Kinetic** — це сучасний розумний PWA-додаток для відстеження харчування, водного балансу та динаміки ваги. Додаток оснащений AI-аналізом їжі по фото, вбудованим сканером штрих-кодів та преміальним інтерфейсом у стилі Apple Bento UI.

![Kinetic App Preview](https://img.shields.io/badge/UI-Premium_Bento-007AFF?style=for-the-badge)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-34C759?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)

## ✨ Головні фічі (Features)

* 📸 **AI-Аналіз їжі:** Сфотографуй страву, і нейромережа (Gemini API) автоматично розпізнає їжу, розрахує вагу, калорії та БЖВ.
* 🍱 **Premium Bento UI:** Сучасний, плавний дизайн з ефектом матового скла (Glassmorphism), плаваючими панелями (як у ChatGPT) та Bottom Sheets.
* 🌗 **Dark / Light Mode:** Повноцінна темна тема з миттєвим безшовним перемиканням.
* 📈 **Інтерактивні графіки:** Відстеження динаміки зміни ваги за допомогою красивих плавних графіків (Chart.js).
* 💧 **Трекінг води:** Зручний облік випитої води з красивими CSS-анімаціями заповнення.
* 🔍 **Сканер штрих-кодів:** Вбудований сканер для швидкого пошуку продуктів у базі (html5-qrcode).
* 🌍 **Мультимовність:** Підтримка 4 мов: Українська, English, Русский, Azərbaycan.
* 📱 **PWA (Progressive Web App):** Встановлюється на екран смартфона як нативний додаток (iOS / Android), працює швидко та підтримує Push-сповіщення.

## 🛠 Технологічний стек (Tech Stack)

**Frontend:**
* HTML5, CSS3 (Custom Bento/Apple Style)
* Vanilla JavaScript (ES6+)
* [Chart.js](https://www.chartjs.org/) (Графіки)
* [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) (Анімації досягнень)
* Service Workers & Manifest (для PWA)

**Backend:**
* Python 3.12
* [FastAPI](https://fastapi.tiangolo.com/) (Високопродуктивний асинхронний фреймворк)
* SQLAlchemy (ORM)
* PostgreSQL (База даних)
* JWT Authentication (Безпека)

**AI Engine:**
* Google Gemini Flash / Pro Vision (Розпізнавання їжі на фото)

## ⚙️ Встановлення та локальний запуск (Installation)

1. **Клонуйте репозиторій:**
   ```bash
   git clone [https://github.com/rustam4ik2006/kinetic-app.git](https://github.com/rustam4ik2006/kinetic-app.git)
   cd kinetic-app
