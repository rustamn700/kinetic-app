import re
from datetime import datetime

class NutritionParser:
    @staticmethod
    def extract_time(description: str) -> str:
        # Шукаємо час у форматі HH:MM
        time_match = re.search(r'(\d{1,2}:\d{2})', description)
        if time_match:
            return time_match.group(1)
        # Якщо час не вказано, беремо поточний
        return datetime.now().strftime("%H:%M")

    @staticmethod
    def get_meal_type(description: str) -> str:
        description = description.lower()
        if "сніданок" in description: return "Сніданок"
        if "обід" in description: return "Обід"
        if "вечеря" in description: return "Вечеря"
        return "Прийом їжі"