from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import database, models
from app.schemas import dish as schemas
from app.services.calculator import NutritionCalculator

router = APIRouter(prefix="/dishes", tags=["dishes"])

# --- ИНГРЕДИЕНТЫ (Простые продукты) ---

@router.post("/ingredients/", response_model=schemas.IngredientResponse)
def create_ingredient(item: schemas.IngredientCreate, db: Session = Depends(database.get_db)):
    # Проверка на дубликат
    if db.query(models.Ingredient).filter(models.Ingredient.name == item.name).first():
        raise HTTPException(status_code=400, detail="Такой ингредиент уже есть!")
    
    new_ing = models.Ingredient(**item.dict())
    db.add(new_ing)
    db.commit()
    db.refresh(new_ing)
    return new_ing

@router.get("/ingredients/", response_model=List[schemas.IngredientResponse])
def get_all_ingredients(db: Session = Depends(database.get_db)):
    return db.query(models.Ingredient).all()

@router.delete("/ingredients/{ing_id}")
def delete_ingredient(ing_id: int, db: Session = Depends(database.get_db)):
    ing = db.query(models.Ingredient).filter(models.Ingredient.id == ing_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ингредиент не найден")
    
    # Нельзя удалить ингредиент, если он используется в блюде!
    in_use = db.query(models.DishIngredient).filter(models.DishIngredient.ingredient_id == ing_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Нельзя удалить: этот продукт используется в рецептах!")

    db.delete(ing)
    db.commit()
    return {"status": "deleted"}

# --- БЛЮДА (Рецепты) ---

@router.post("/", response_model=schemas.DishResponse)
def create_dish(dish_in: schemas.DishCreate, db: Session = Depends(database.get_db)):
    if db.query(models.Dish).filter(models.Dish.name == dish_in.name).first():
        raise HTTPException(status_code=400, detail="Блюдо с таким названием уже есть!")

    # 1. Создаем само блюдо
    new_dish = models.Dish(name=dish_in.name, description=dish_in.description)
    db.add(new_dish)
    db.commit()
    db.refresh(new_dish)

    # 2. Добавляем ингредиенты
    for item in dish_in.ingredients:
        link = models.DishIngredient(
            dish_id=new_dish.id,
            ingredient_id=item.ingredient_id,
            weight_g=item.weight_g
        )
        db.add(link)
    
    db.commit()
    
    # 3. Считаем калории для ответа
    calc = NutritionCalculator.calculate_dish(new_dish)
    
    return {
        "id": new_dish.id,
        "name": new_dish.name,
        "description": new_dish.description,
        "total_kcal": calc["total_kcal"]
    }

@router.get("/", response_model=List[schemas.DishResponse])
def get_all_dishes(db: Session = Depends(database.get_db)):
    dishes = db.query(models.Dish).all()
    results = []
    for d in dishes:
        calc = NutritionCalculator.calculate_dish(d)
        results.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "total_kcal": calc["total_kcal"]
        })
    return results

@router.delete("/{dish_id}")
def delete_dish(dish_id: int, db: Session = Depends(database.get_db)):
    # Сначала удаляем связи с ингредиентами
    db.query(models.DishIngredient).filter(models.DishIngredient.dish_id == dish_id).delete()
    
    # Потом само блюдо
    dish = db.query(models.Dish).filter(models.Dish.id == dish_id).first()
    if dish:
        db.delete(dish)
        db.commit()
    return {"status": "deleted"}

# (Твой старый router.get("/calculate") оставь здесь же)
@router.get("/calculate")
async def calculate_dish_by_name(query: str, db: Session = Depends(database.get_db)):
    # ... старый код ...
    dish = db.query(models.Dish).filter(models.Dish.name.ilike(f"%{query}%")).first()
    if not dish: raise HTTPException(status_code=404, detail="Not found")
    return NutritionCalculator.calculate_dish(dish)

@router.get("/search")
def search_food(q: str, db: Session = Depends(database.get_db)):
    """
    Живий пошук: шукає і серед готових страв, і серед продуктів.
    Повертає топ-5 результатів.
    """
    if not q or len(q) < 2:
        return []

    # 1. Шукаємо в Стравах (Dishes)
    dishes = db.query(models.Dish).filter(models.Dish.name.ilike(f"%{q}%")).limit(5).all()
    
    # 2. Шукаємо в Інгредієнтах (Ingredients)
    ingredients = db.query(models.Ingredient).filter(models.Ingredient.name.ilike(f"%{q}%")).limit(5).all()
    
    results = []

    # Форматуємо страви
    for d in dishes:
        calc = NutritionCalculator.calculate_dish(d)
        results.append({
            "name": d.name,
            "info": f"Страва • {calc['total_kcal']} ккал",
            "type": "dish"
        })

    # Форматуємо інгредієнти
    for i in ingredients:
        results.append({
            "name": i.name,
            "info": f"Продукт • {i.kcal} ккал/100г",
            "type": "ingredient"
        })
    
    return results