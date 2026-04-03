from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os

# --- ІМПОРТИ РОУТЕРІВ (тільки один раз кожен) ---
from app.api import auth, meals, dishes, ai_search, photo_meals, categories, weight
from app.db import models, database
from app.services.importer import import_products_from_json

# --- СТВОРЕННЯ ТАБЛИЦЬ БД ---
models.Base.metadata.create_all(bind=database.engine)

def seed_database():
    db = database.SessionLocal()
    try:
        if db.query(models.Ingredient).count() == 0:
            print("🌱 Заповнюємо базу початковими інгредієнтами...")
            import_products_from_json(db)
            db.commit()
            print("✅ База даних готова до роботи.")
    except Exception as e:
        print(f"🔴 Помилка ініціалізації бази: {e}")
    finally:
        db.close()

seed_database()

# --- СТВОРЕННЯ APP (обов'язково ДО include_router) ---
app = FastAPI(
    title="Kinetic API",
    description="Backend for AI Food Recognition & Tracking",
    version="1.0.0"
)

# --- MIDDLEWARE ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Permissions-Policy"] = "camera=*"
        return response

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ПІДКЛЮЧЕННЯ РОУТЕРІВ (тільки після app = FastAPI()) ---
app.include_router(auth.router,         tags=["Authentication"])
app.include_router(meals.router,        tags=["Meals"])
app.include_router(dishes.router,       tags=["Dishes"])
app.include_router(ai_search.router,    tags=["AI Search"])
app.include_router(photo_meals.router,  prefix="/meals", tags=["AI Photo Analysis"])
app.include_router(categories.router,   prefix="/catalog", tags=["Catalog"])
app.include_router(weight.router,       prefix="/weight", tags=["Weight History"])

@app.get("/")
async def read_root():
    return FileResponse("static/login.html")

# --- СТАТИКА ---
if os.path.exists("data"):
    app.mount("/data", StaticFiles(directory="data"), name="data")

if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static"), name="static")