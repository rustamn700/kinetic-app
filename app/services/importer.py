import json
import os
from sqlalchemy.orm import Session
from app.db import models

def import_products_from_json(db: Session, file_path: str = "data/products.json"):
    if not os.path.exists(file_path):
        print(f"⚠️ Файл {file_path} не знайдено.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("🔄 Починаємо імпорт продуктів...")

    for cat_data in data:
        # 1. Створюємо або знаходимо Головну Категорію
        main_cat = db.query(models.Category).filter_by(name=cat_data["category"], parent_id=None).first()
        if not main_cat:
            main_cat = models.Category(name=cat_data["category"], icon=cat_data.get("icon", "📦"))
            db.add(main_cat)
            db.commit()
            db.refresh(main_cat)

        # 2. Проходимо по підкатегоріях
        for sub_data in cat_data.get("subcategories", []):
            sub_cat = db.query(models.Category).filter_by(name=sub_data["name"], parent_id=main_cat.id).first()
            if not sub_cat:
                sub_cat = models.Category(name=sub_data["name"], parent_id=main_cat.id, icon=main_cat.icon)
                db.add(sub_cat)
                db.commit()
                db.refresh(sub_cat)

            # 3. Додаємо продукти
            for prod in sub_data.get("products", []):
                exists = db.query(models.Product).filter_by(name=prod["name"], category_id=sub_cat.id).first()
                if not exists:
                    new_prod = models.Product(
                        name=prod["name"],
                        calories=prod["calories"],
                        protein=prod["protein"],
                        fat=prod["fat"],
                        carbs=prod["carbs"],
                        sugar=prod.get("sugar", 0),
                        fiber=prod.get("fiber", 0),
                        category_id=sub_cat.id
                    )
                    db.add(new_prod)
            
            db.commit()
    
    print("✅ Імпорт завершено успішно!")