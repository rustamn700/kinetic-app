from sqlalchemy.orm import Session
from app.db import models
from app.services.openfoodfacts_client import OpenFoodFactsClient
from app.services.text_parser import TextParser

class FoodSearchService:
    # Приблизні значення ккал на 100г для fallback
    APPROX_MAP = {
        "шаурма": {"kcal": 175, "p": 9, "f": 8, "c": 18},
        "бургер": {"kcal": 250, "p": 12, "f": 14, "c": 20},
        "плов": {"kcal": 210, "p": 8, "f": 9, "c": 25},
        "курка": {"kcal": 165, "p": 25, "f": 6, "c": 0},
        "рис": {"kcal": 130, "p": 2.5, "f": 0.3, "c": 28},
        "гречка": {"kcal": 343, "p": 13, "f": 3, "c": 72},
        "омлет": {"kcal": 154, "p": 11, "f": 11, "c": 1}
    }

    def __init__(self, db: Session):
        self.db = db
        self.off_client = OpenFoodFactsClient()

    async def process_query(self, query: str):
        weight = TextParser.extract_weight(query)
        
        # 1. Пошук у твоїй базі
        local_dish = self.db.query(models.Dish).filter(models.Dish.name.ilike(f"%{query}%")).first()
        if local_dish:
            return self._format_local(local_dish, weight)

        # 2. Пошук через OpenFoodFacts API
        api_data = await self.off_client.search(query)
        if api_data:
            return self._format_api(api_data, weight)

        # 3. Якщо нічого не знайдено — AI Fallback
        return self._format_fallback(query, weight)

    def _safe_float(self, value):
        """Безпечне перетворення в число"""
        try:
            return float(value) if value is not None else 0.0
        except (TypeError, ValueError):
            return 0.0

    def _format_api(self, p, weight):
        n = p.get("nutriments", {})
        ratio = weight / 100
        return {
            "meal_name": p.get("product_name", "Невідомий продукт"),
            "estimated_weight": weight,
            "calories": int(self._safe_float(n.get("energy-kcal_100g", 0)) * ratio),
            "protein": round(self._safe_float(n.get("proteins_100g", 0)) * ratio, 1),
            "fat": round(self._safe_float(n.get("fat_100g", 0)) * ratio, 1),
            "carbs": round(self._safe_float(n.get("carbohydrates_100g", 0)) * ratio, 1),
            "sugar": round(self._safe_float(n.get("sugars_100g", 0)) * ratio, 1),
            "fiber": round(self._safe_float(n.get("fiber_100g", 0)) * ratio, 1),
            "source": "openfoodfacts"
        }

    def _format_fallback(self, query, weight):
        keywords = TextParser.get_keywords(query)
        base = {"kcal": 150, "p": 10, "f": 5, "c": 15}
        for kw in keywords:
            if kw in self.APPROX_MAP:
                base = self.APPROX_MAP[kw]
                break
        
        ratio = weight / 100
        return {
            "meal_name": query.capitalize(),
            "estimated_weight": weight,
            "calories": int(base["kcal"] * ratio),
            "protein": round(base["p"] * ratio, 1),
            "fat": round(base["f"] * ratio, 1),
            "carbs": round(base["c"] * ratio, 1),
            "sugar": 0.0, "fiber": 0.0,
            "source": "fallback"
        }

    def _format_local(self, dish, weight):
        # --- ВИПРАВЛЕННЯ ТУТ ---
        # Ми рахуємо калорії динамічно, підсумовуючи інгредієнти
        total_kcal = 0
        total_prot = 0
        total_fat = 0
        total_carb = 0
        total_w = 0

        # Отримуємо інгредієнти через зв'язок dish_ingredients
        ingredients = getattr(dish, "dish_ingredients", [])

        for item in ingredients:
            w = item.weight_g
            ing = item.ingredient
            
            total_w += w
            total_kcal += (ing.kcal * w / 100)
            total_prot += (ing.protein * w / 100)
            total_fat += (ing.fats * w / 100)
            total_carb += (ing.carbs * w / 100)

        # Уникаємо ділення на нуль, якщо страва порожня
        if total_w == 0: total_w = 100

        # Скільки ми з'їли відносно цілого рецепту
        ratio = weight / total_w

        return {
            "meal_name": dish.name,
            "estimated_weight": weight,
            "calories": int(total_kcal * ratio),
            "protein": round(total_prot * ratio, 1),
            "fat": round(total_fat * ratio, 1),
            "carbs": round(total_carb * ratio, 1),
            "sugar": 0, "fiber": 0,
            "source": "local"
        }