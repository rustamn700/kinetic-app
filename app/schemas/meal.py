from pydantic import BaseModel
from datetime import datetime

# То, что мы отправляем на сервер (только название и вес)
class MealInput(BaseModel):
    product_name: str
    grams: int

# То, что сервер отдает обратно (полная инфа с БЖУ)
class MealResponse(BaseModel):
    id: int
    name: str
    grams: int
    total_kcal: int
    total_protein: float
    total_fats: float
    total_carbs: float
    timestamp: datetime
    
    class Config:
        from_attributes = True