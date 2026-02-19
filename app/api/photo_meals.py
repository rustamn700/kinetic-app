from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.db import models
from app.db.database import get_db
from app.api import auth 
from app.services.ai_vision import analyze_food_with_gemini

router = APIRouter()

# ⚙️ НАСТРОЙКА ЛИМИТА
DAILY_PHOTO_LIMIT = 15 

@router.get("/limits")
async def get_photo_limits(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()

    # Сброс счетчика, если день сменился
    if current_user.last_photo_date != today:
        current_user.photo_count = 0
        current_user.last_photo_date = today
        db.commit()

    used = current_user.photo_count or 0
    remaining = max(0, DAILY_PHOTO_LIMIT - used)

    return {
        "limit": DAILY_PHOTO_LIMIT,
        "used": used,
        "remaining": remaining
    }

@router.post("/analyze-photo") 
async def analyze_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Проверка смены дня (на всякий случай дублируем)
    today = date.today()
    if current_user.last_photo_date != today:
        current_user.photo_count = 0
        current_user.last_photo_date = today
        db.commit()

    # 2. ПРОВЕРКА ЛИМИТА
    if current_user.photo_count >= DAILY_PHOTO_LIMIT:
        # Возвращаем специальный JSON, чтобы JS красиво показал ошибку
        return {"limit_reached": True, "error": "Ліміт на сьогодні вичерпано"}

    # 3. Проверка типа файла
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 4. Анализ
    image_data = await file.read()
    result = await analyze_food_with_gemini(image_data)
    
    # 5. Если успех (не ошибка AI) — увеличиваем счетчик
    if "error" not in result:
        current_user.photo_count = (current_user.photo_count or 0) + 1
        db.commit()
    
    return result