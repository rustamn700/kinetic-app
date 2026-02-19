from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import database
from app.schemas.ai_food import AISearchRequest, AIFoodResponse
from app.services.food_search_service import FoodSearchService

router = APIRouter(prefix="/ai-search", tags=["AI"])

@router.post("/", response_model=AIFoodResponse)
async def ai_food_search(
    req: AISearchRequest, 
    db: Session = Depends(database.get_db)
):
    service = FoodSearchService(db)
    result = await service.process_query(req.query)
    return result