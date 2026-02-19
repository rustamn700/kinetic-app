from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import database, models
from typing import List
from pydantic import BaseModel

# Убираем prefix отсюда, так как он уже есть в main.py
router = APIRouter(tags=["Catalog"])

# Pydantic схеми
class ProductOut(BaseModel):
    id: int
    name: str
    calories: int
    protein: float
    fat: float
    carbs: float
    
    class Config:
        from_attributes = True # <--- БУЛО orm_mode = True

class CategoryOut(BaseModel):
    id: int
    name: str
    icon: str
    
    class Config:
        from_attributes = True # <--- БУЛО orm_mode = True

# 1. Отримати головні категорії
@router.get("/categories", response_model=List[CategoryOut])
async def get_main_categories(db: Session = Depends(database.get_db)):
    return db.query(models.Category).filter(models.Category.parent_id == None).all()

# 2. Отримати підкатегорії
@router.get("/categories/{cat_id}/subcategories", response_model=List[CategoryOut])
async def get_subcategories(cat_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Category).filter(models.Category.parent_id == cat_id).all()

# 3. Отримати продукти
@router.get("/categories/{cat_id}/products", response_model=List[ProductOut])
async def get_products_by_category(cat_id: int, db: Session = Depends(database.get_db)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категорія не знайдена")
    
    if cat.children:
        sub_ids = [child.id for child in cat.children]
        return db.query(models.Product).filter(models.Product.category_id.in_(sub_ids)).all()
    else:
        return db.query(models.Product).filter(models.Product.category_id == cat_id).all()