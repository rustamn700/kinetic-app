from pydantic import BaseModel
from typing import Optional

class AISearchRequest(BaseModel):
    query: str

class AIFoodResponse(BaseModel):
    meal_name: str
    estimated_weight: int
    calories: int
    protein: float
    fat: float
    carbs: float
    sugar: float
    fiber: float
    source: str # "local" | "openfoodfacts" | "fallback"