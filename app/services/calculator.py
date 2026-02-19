from sqlalchemy.orm import Session
from app.db.models import Dish, DishIngredient

class NutritionCalculator:
    @staticmethod
    def calculate_dish(dish: Dish) -> dict:
        """
        Принимает объект Dish из базы.
        Пробегается по всем ингредиентам.
        Считает сумму БЖУ по весу.
        """
        total = {
            "weight": 0, "kcal": 0, "protein": 0.0, 
            "fats": 0.0, "carbs": 0.0, "sugar": 0.0, "fiber": 0.0
        }
        
        ingredients_data = []

        for item in dish.ingredients:
            ing = item.ingredient
            weight = item.weight_g
            coef = weight / 100.0  # Коэффициент веса
            
            # Считаем конкретно для этого ингредиента
            i_kcal = int(ing.kcal * coef)
            i_prot = round(ing.protein * coef, 1)
            i_fats = round(ing.fats * coef, 1)
            i_carbs = round(ing.carbs * coef, 1)
            i_sugar = round(ing.sugar * coef, 1)
            i_fiber = round(ing.fiber * coef, 1)

            # Добавляем в список деталей
            ingredients_data.append({
                "name": ing.name,
                "weight_g": weight,
                "kcal": i_kcal,
                "protein": i_prot,
                "fats": i_fats,
                "carbs": i_carbs
            })

            # Суммируем в итог
            total["weight"] += weight
            total["kcal"] += i_kcal
            total["protein"] += i_prot
            total["fats"] += i_fats
            total["carbs"] += i_carbs
            total["sugar"] += i_sugar
            total["fiber"] += i_fiber

        # Округляем итоги
        return {
            "dish_name": dish.name,
            "total_weight": total["weight"],
            "total_kcal": total["kcal"],
            "total_protein": round(total["protein"], 1),
            "total_fats": round(total["fats"], 1),
            "total_carbs": round(total["carbs"], 1),
            "total_sugar": round(total["sugar"], 1),
            "total_fiber": round(total["fiber"], 1),
            "ingredients": ingredients_data
        }