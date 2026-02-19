from app.schemas.photo_meal import PhotoMealResponse, Ingredient

class PhotoRecognitionService:
    async def process_image_and_text(self, description: str) -> PhotoMealResponse:
        # Mock логіка: імітуємо розпізнавання на основі ключових слів
        desc_lower = description.lower()
        
        if "плов" in desc_lower:
            return PhotoMealResponse(
                meal_name="Плов по-азербайджански",
                meal_time="--:--", # Заповниться в API
                calories=975, protein=45.5, fat=32.8, carbs=121.8,
                sugar=4.2, fiber=8.5, weight=380,
                ingredients=[
                    Ingredient(name="Рис басматі", weight=150),
                    Ingredient(name="Куряче філе", weight=150),
                    Ingredient(name="Морква", weight=50)
                ]
            )
        
        # Дефолтна відповідь для невідомої страви
        return PhotoMealResponse(
            meal_name="Здорова страва",
            meal_time="--:--",
            calories=450, protein=25.0, fat=15.0, carbs=45.0,
            sugar=2.0, fiber=5.0, weight=300,
            ingredients=[Ingredient(name="Продукти в асортименті", weight=300)]
        )