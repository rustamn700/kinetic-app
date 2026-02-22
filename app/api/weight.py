from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.db import models, database
from app.api.auth import get_current_user

router = APIRouter()

class WeightEntry(BaseModel):
    weight: float

@router.post("/")
def add_weight(entry: WeightEntry, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    today = datetime.now().date()
    
    # Ищем, не вводили ли мы вес уже сегодня
    record = db.query(models.WeightHistory).filter(
        models.WeightHistory.user_id == current_user.id,
        models.WeightHistory.date == today
    ).first()

    if record:
        record.weight = entry.weight # Обновляем вес за сегодня
    else:
        record = models.WeightHistory(user_id=current_user.id, weight=entry.weight, date=today)
        db.add(record)
    
    # Также обновляем текущий вес в самом профиле юзера
    current_user.weight = entry.weight
    db.commit()
    
    return {"status": "success", "weight": entry.weight}

@router.get("/history")
def get_weight_history(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    history = db.query(models.WeightHistory).filter(
        models.WeightHistory.user_id == current_user.id
    ).order_by(models.WeightHistory.date.asc()).all()
    
    result = [{"date": h.date.strftime("%d.%m"), "weight": h.weight} for h in history]
    
    # Делаем красивую стартовую точку "52 кг" из твоей реальной истории
    if not result:
        return [
            {"date": "Старт", "weight": 52.0},
            {"date": "Зараз", "weight": current_user.weight}
        ]
    elif len(result) == 1:
        return [{"date": "Старт", "weight": 52.0}] + result
        
    return result