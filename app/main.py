from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import time
import os

# Импорты твоих модулей
from app.api import auth, meals, dishes, ai_search, photo_meals, categories
from app.db import models, database
from app.services.importer import import_products_from_json

# Створення таблиць БД
models.Base.metadata.create_all(bind=database.engine)

# Функція заповнення бази
def seed_database():
    db = database.SessionLocal()
    try:
        if db.query(models.Ingredient).count() == 0:
            print("🌱 Заповнюємо базу початковими інгредієнтами...")
            db.commit()
        import_products_from_json(db)
        print("✅ База даних готова до роботи.")
    except Exception as e:
        print(f"🔴 Помилка ініціалізації бази: {e}")
    finally:
        db.close()

seed_database()

app = FastAPI(
    title="Kinetic API",
    description="Backend for AI Food Recognition & Tracking",
    version="1.0.0"
)

# --- НАЛАШТУВАННЯ CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- НАЛАШТУВАННЯ ШАБЛОНІВ (JINJA2) ---
# Вказуємо папку, де лежать HTML файли
templates = Jinja2Templates(directory="static")

# --- ПІДКЛЮЧЕННЯ РОУТЕРІВ ---

# 1. СТАРІ ФАЙЛИ (Без додаткових префіксів, вони всередині)
app.include_router(auth.router, tags=["Authentication"])
app.include_router(meals.router, tags=["Meals"])
app.include_router(dishes.router, tags=["Dishes"])
app.include_router(ai_search.router, tags=["AI Search"])

# 2. НОВІ ФАЙЛИ (З префіксами)
# Камера: шлях буде /meals/analyze-photo
app.include_router(photo_meals.router, prefix="/meals", tags=["AI Photo Analysis"]) 

# Каталог: шлях буде /catalog/categories (якщо в categories.py прибрано prefix)
app.include_router(categories.router, prefix="/catalog", tags=["Catalog"])


# --- ПІДКЛЮЧЕННЯ СТАТИКИ ---
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# --- ГОЛОВНА СТОРІНКА (З АВТО-ВЕРСІЄЮ) ---
@app.get("/")
async def main_page(request: Request):
    import time
    # Это главная страница. Если юзер не залогинен, JS сам его перекинет дальше.
    return templates.TemplateResponse("dashboard.html", {"request": request, "v": int(time.time())})
    
    # Віддаємо HTML і передаємо туди змінну "v"
    return templates.TemplateResponse(
        "dashboard.html", 
        {"request": request, "v": ver}
    )

# Добавь этот код в main.py
@app.get("/login.html")
async def login_page(request: Request):
    import time
    return templates.TemplateResponse("login.html", {"request": request, "v": int(time.time())})


# В app/main.py
@app.get("/register.html")
async def register_page(request: Request):
    import time
    return templates.TemplateResponse("register.html", {"request": request, "v": int(time.time())})


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return RedirectResponse(url="/static/favicon.ico")

