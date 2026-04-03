from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.db import database, models
from app.core import security
from app.api.deps import get_current_user  # <-- Імпортуємо централізовано
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Auth"])

# --- МОДЕЛІ ДАНИХ ---
class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfileUpdate(BaseModel):
    gender: str
    age: int
    weight: float
    height: int
    activity_level: float
    goal_type: str  # lose, maintain, gain

# --- РОУТИ ---

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    # 1. Перевірка пароля
    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Пароль має містити мінімум 8 символів")
        
    # 2. Перевірка на Gmail
    if not user.email.endswith("@gmail.com"):
        raise HTTPException(status_code=400, detail="Реєстрація дозволена лише для Gmail")

    # 3. Перевірка на унікальність
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Цей Email вже зайнятий")

    # 🔥 4. ЗБЕРЕЖЕННЯ В БАЗУ (це те, чого не вистачало)
    hashed_pwd = security.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Користувача створено успішно"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Невірний логін або пароль")
    
    # Створюємо токен на 7 днів
    token = security.create_access_token(data={"sub": user.email}, expires_delta=timedelta(days=7))
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "daily_goal": current_user.daily_goal,
        "gender": current_user.gender,
        "age": current_user.age,
        "weight": current_user.weight,
        "height": current_user.height,
        "activity_level": current_user.activity_level,
        "goal_type": current_user.goal_type
    }

@router.put("/update-profile")
def update_profile(data: UserProfileUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Оновлюємо дані користувача
    current_user.gender = data.gender
    current_user.age = data.age
    current_user.weight = data.weight
    current_user.height = data.height
    current_user.activity_level = data.activity_level
    current_user.goal_type = data.goal_type

    # 2. Розрахунок калорій (Миффлин-Сан Жеор)
    s = 5 if data.gender == 'male' else -161
    bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + s
    
    tdee = bmr * data.activity_level

    # 3. Коригування під ціль
    if data.goal_type == 'lose':
        final_goal = int(tdee * 0.80)
    elif data.goal_type == 'gain':
        final_goal = int(tdee * 1.15)
    else:
        final_goal = int(tdee)

    current_user.daily_goal = final_goal
    db.commit()
    
    return {"status": "updated", "new_goal": final_goal}