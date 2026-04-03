from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import database, models
from app.api.auth import get_current_user
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
# Імпортуємо функцію аналізу (переконайся, що ai_vision.py збережений)
from app.services.ai_vision import analyze_food_with_gemini, FULL_DB

router = APIRouter(prefix="/meals", tags=["Meals"])

# --- Схеми (Pydantic Models) ---
class MealCreate(BaseModel):
    product_name: str
    grams: int
    total_kcal: Optional[int] = None
    total_protein: Optional[float] = None
    total_fats: Optional[float] = None
    total_carbs: Optional[float] = None
    cuisine: Optional[str] = None
    confidence: Optional[float] = None
    ingredients: Optional[str] = None

class CustomProductCreate(BaseModel):
    name: str
    calories: int
    protein: float
    fat: float
    carbs: float
    barcode: Optional[str] = None  # Поле для штрих-коду

class MealOut(BaseModel):
    id: int
    name: str
    grams: int
    total_kcal: int
    total_protein: float
    total_fats: float
    total_carbs: float
    cuisine: Optional[str]
    timestamp: datetime
    class Config:
        from_attributes = True

class WaterUpdate(BaseModel):
    amount: int

# --- НОВИЙ ЕНДПОІНТ: АНАЛІЗ ФОТО ---
@router.post("/analyze-photo")
async def analyze_photo(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    """
    Приймає фото з камери і відправляє в Gemini.
    Обробляє помилки м'яко, щоб не ламати фронтенд.
    """
    try:
        content = await file.read()
        
        # Викликаємо AI сервіс
        result = await analyze_food_with_gemini(content)
        
        # Якщо сервіс повернув помилку (наприклад, не розпізнав їжу)
        if "error" in result:
            # Повертаємо JSON з помилкою, а не статус 400, щоб JS міг це обробити
            return {"error": result["error"]}
            
        return result
        
    except Exception as e:
        print(f"🔴 Critical Server Error during analysis: {e}")
        return {"error": "Критична помилка сервера. Спробуйте пізніше."}

# --- ПОШУК ПО ШТРИХ-КОДУ ---
@router.get("/barcode/{barcode}")
async def get_product_by_barcode(barcode: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Шукаємо в базі користувацьких продуктів
    product = db.query(models.CustomProduct).filter(models.CustomProduct.barcode == barcode).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Not found in local DB")
    
    return {
        "name": product.name,
        "calories": product.calories,
        "protein": product.protein,
        "fat": product.fat,
        "carbs": product.carbs,
        "unit": "г",
        "icon": "⭐️",
        "cuisine": "Custom",
        "barcode": product.barcode
    }

# --- БАЗА ПРОДУКТІВ (GLOBAL + CUSTOM) ---
@router.get("/database")
async def get_full_food_database(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    flat_products = []
    
    # 1. Додаємо власні продукти
    custom_products = db.query(models.CustomProduct).filter(models.CustomProduct.user_id == current_user.id).all()
    for cp in custom_products:
        flat_products.append({
            "name": cp.name,
            "calories": cp.calories,
            "protein": cp.protein,
            "fat": cp.fat,
            "carbs": cp.carbs,
            "unit": "г",
            "icon": "⭐️",
            "cuisine": "Custom"
        })

    # 2. Додаємо глобальну базу
    for category in FULL_DB:
        icon = category.get("icon", "🍽️")
        cat_name = category.get("category", "")
        cuisine = "Ukrainian" if "Українська" in cat_name else "Azerbaijani" if "Азербайджан" in cat_name else "Other"
        
        if "subcategories" in category:
            for sub in category["subcategories"]:
                if "products" in sub:
                    for prod in sub["products"]:
                        flat_products.append({
                            "name": prod["name"],
                            "calories": prod["calories"],
                            "protein": prod["protein"],
                            "fat": prod.get("fat", 0),
                            "carbs": prod.get("carbs", 0),
                            "unit": prod.get("unit", "г"),
                            "weight_per_piece": prod.get("weight_per_piece", 0),
                            "ingredients": prod.get("ingredients", "Інгредієнти не вказані"),
                            "icon": icon,
                            "cuisine": cuisine
                        })
    return flat_products

# --- СТВОРЕННЯ ВЛАСНОГО ПРОДУКТУ (З підтримкою штрих-коду) ---
@router.post("/custom")
async def create_custom_product(payload: CustomProductCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Перевірка на дублікат штрих-коду
    if payload.barcode:
        exists = db.query(models.CustomProduct).filter(
            models.CustomProduct.barcode == payload.barcode,
            models.CustomProduct.user_id == current_user.id
        ).first()
        if exists:
            return {"status": "exists", "message": "Product exists"}

    new_prod = models.CustomProduct(
        name=payload.name,
        calories=payload.calories,
        protein=payload.protein,
        fat=payload.fat,
        carbs=payload.carbs,
        user_id=current_user.id,
        barcode=payload.barcode # Зберігаємо штрих-код
    )
    db.add(new_prod)
    db.commit()
    return {"status": "created"}

# --- ДОДАВАННЯ ЇЖІ В ЩОДЕННИК ---
@router.post("/", response_model=MealOut)
async def add_meal(meal: MealCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if meal.total_kcal is not None:
        kcal, prot, fats, carbs = meal.total_kcal, meal.total_protein, meal.total_fats, meal.total_carbs
    else:
        # Авторозрахунок, якщо дані не прийшли
        kcal = int(meal.grams * 1.5)
        prot, fats, carbs = round(meal.grams * 0.1, 1), round(meal.grams * 0.05, 1), round(meal.grams * 0.2, 1)

    new_meal = models.Meal(
        name=meal.product_name, 
        grams=meal.grams, 
        total_kcal=kcal, 
        total_protein=prot, 
        total_fats=fats, 
        total_carbs=carbs, 
        cuisine=meal.cuisine, 
        confidence=meal.confidence, 
        ingredients=meal.ingredients, 
        user_id=current_user.id
    )
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    return new_meal

# --- ВОДА ---
@router.post("/water")
async def add_water(payload: WaterUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    new_water = models.WaterIntake(amount_ml=payload.amount, user_id=current_user.id)
    db.add(new_water)
    db.commit()
    return {"status": "ok", "added": payload.amount}

@router.put("/water")
async def set_water_today(payload: WaterUpdate, date_str: Optional[str] = Query(None, alias="date"), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if date_str: target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else: target_date = date.today()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    
    db.query(models.WaterIntake).filter(models.WaterIntake.user_id == current_user.id, models.WaterIntake.timestamp >= start, models.WaterIntake.timestamp <= end).delete()
    
    if payload.amount > 0:
        new_water = models.WaterIntake(amount_ml=payload.amount, user_id=current_user.id, timestamp=datetime.combine(target_date, datetime.now().time()))
        db.add(new_water)
    
    db.commit()
    return {"status": "updated", "total": payload.amount}

@router.get("/water/today")
async def get_water_today(date_str: Optional[str] = Query(None, alias="date"), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if date_str: target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else: target_date = date.today()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    total = db.query(func.sum(models.WaterIntake.amount_ml)).filter(models.WaterIntake.user_id == current_user.id, models.WaterIntake.timestamp >= start, models.WaterIntake.timestamp <= end).scalar()
    return {"total_ml": total or 0}

# --- ІСТОРІЯ ТА СТАТИСТИКА ---
@router.get("/", response_model=List[MealOut])
async def get_meals(date_str: Optional[str] = Query(None, alias="date"), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if date_str: target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else: target_date = date.today()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    return db.query(models.Meal).filter(models.Meal.user_id == current_user.id, models.Meal.timestamp >= start, models.Meal.timestamp <= end).all()

@router.get("/stats")
async def get_day_stats(date_str: Optional[str] = Query(None, alias="date"), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if date_str: target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else: target_date = date.today()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    stats = db.query(func.sum(models.Meal.total_kcal).label("total"), func.sum(models.Meal.total_protein).label("protein"), func.sum(models.Meal.total_fats).label("fats"), func.sum(models.Meal.total_carbs).label("carbs")).filter(models.Meal.user_id == current_user.id, models.Meal.timestamp >= start, models.Meal.timestamp <= end).first()
    return {"total": stats.total or 0, "protein": stats.protein or 0, "fats": stats.fats or 0, "carbs": stats.carbs or 0}

@router.get("/week")
async def get_weekly_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    today = date.today()
    start = today - timedelta(days=6)
    results = []
    for i in range(7):
        day = start + timedelta(days=i)
        s, e = datetime.combine(day, datetime.min.time()), datetime.combine(day, datetime.max.time())
        total = db.query(func.sum(models.Meal.total_kcal)).filter(models.Meal.user_id == current_user.id, models.Meal.timestamp >= s, models.Meal.timestamp <= e).scalar()
        results.append({"date": day.strftime("%Y-%m-%d"), "total": total or 0})
    return results

@router.delete("/{meal_id}")
async def delete_meal(meal_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id, models.Meal.user_id == current_user.id).first()
    if not meal: raise HTTPException(status_code=404, detail="Not found")
    db.delete(meal)
    db.commit()
    return {"status": "ok"}