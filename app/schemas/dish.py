from pydantic import BaseModel
from typing import List, Optional

# --- ДЛЯ СОЗДАНИЯ ---

# 1. Создание простого ингредиента (Рис, Яйцо)
class IngredientCreate(BaseModel):
    name: str
    kcal: int
    protein: float
    fats: float
    carbs: float
    sugar: float = 0.0
    fiber: float = 0.0

# 2. Элемент рецепта (ID ингредиента + вес)
class RecipeItem(BaseModel):
    ingredient_id: int
    weight_g: int

# 3. Создание блюда (Название + Список ингредиентов)
class DishCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ingredients: List[RecipeItem]

# --- ДЛЯ ОТВЕТОВ ---

class IngredientResponse(IngredientCreate):
    id: int
    class Config:
        from_attributes = True

class DishResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    total_kcal: int
    class Config:
        from_attributes = True
        
# (Старые схемы DishResult можно оставить ниже, если они там были)