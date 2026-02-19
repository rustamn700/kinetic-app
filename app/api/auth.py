from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from app.db import database, models
from app.core import security
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    payload = security.decode_access_token(token)
    if payload is None: raise HTTPException(status_code=401, detail="Invalid token")
    email: str = payload.get("sub")
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None: raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email registered")
    hashed_pw = security.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"msg": "User created"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect credentials")
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

# --- 🔥 ОНОВЛЕННЯ ПРОФІЛЮ ТА РОЗРАХУНОК КАЛОРІЙ ---
@router.put("/update-profile")
def update_profile(data: UserProfileUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Зберігаємо дані
    current_user.gender = data.gender
    current_user.age = data.age
    current_user.weight = data.weight
    current_user.height = data.height
    current_user.activity_level = data.activity_level
    current_user.goal_type = data.goal_type

    # 2. Формула Міффліна-Сан Жера
    # BMR = 10*вага + 6.25*зріст - 5*вік + s (s=+5 для чоловіків, s=-161 для жінок)
    s = 5 if data.gender == 'male' else -161
    bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + s
    
    # 3. TDEE (З урахуванням активності)
    tdee = bmr * data.activity_level

    # 4. Коригування під ціль
    if data.goal_type == 'lose':
        final_goal = int(tdee * 0.80) # Дефіцит 20%
    elif data.goal_type == 'gain':
        final_goal = int(tdee * 1.15) # Профіцит 15%
    else:
        final_goal = int(tdee)        # Підтримка

    current_user.daily_goal = final_goal
    db.commit()
    
    return {"status": "updated", "new_goal": final_goal}