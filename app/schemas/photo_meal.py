from pydantic import BaseModel
from typing import List, Optional

class Ingredient(BaseModel):
    name: str
    weight: int

class PhotoMealResponse(BaseModel):
    meal_name: str
    meal_time: str
    calories: int
    protein: float
    fat: float
    carbs: float
    sugar: float
    fiber: float
    weight: int
    ingredients: List[Ingredient]