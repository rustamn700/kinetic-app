import json
import os
import base64
import httpx
from fastapi import UploadFile
from dotenv import load_dotenv

# Завантажуємо приховані змінні
load_dotenv()

# --- БАЗА ПРОДУКТІВ ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(APP_DIR)

POSSIBLE_PATHS = [
    os.path.join(ROOT_DIR, "data", "products.json"),
    os.path.join(APP_DIR, "data", "products.json"),
]

def load_products_db():
    final_path = None
    for path in POSSIBLE_PATHS:
        if os.path.exists(path):
            final_path = path
            break
    if not final_path:
        return []
    try:
        with open(final_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

FULL_DB = load_products_db()

# --- 🔥 AI VISION: GEMINI 2.5 FLASH ---

# Беремо ключ з безпечного місця (.env або Render Environment)
# Якщо ключа там немає, використовуємо твій (але краще сховай його!) 
MODEL_NAME = "gemini-2.5-flash"

async def analyze_food_with_gemini(image_bytes: bytes):
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
    except:
        return {"error": "Помилка обробки файлу"}

    # Прямий URL до моделі
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"
    
    # Авторизація через заголовок
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
    }

    # 🔥 ТОТ САМЫЙ СУПЕР-ПРОМПТ
    prompt_text = """Ти — професійний дієтолог та експерт з оцінки калорійності їжі по фото. 
Твоє завдання — проаналізувати зображення, розпізнати всі страви та продукти, і повернути результат ВИНЯТКОВО у форматі JSON.

ПРАВИЛА АНАЛІЗУ (КРИТИЧНО ВАЖЛИВО):
1. Складні страви: Якщо ти бачиш складну страву (борщ, плов, салат, бургер), не намагайся вгадати калорії з повітря. Візуально розклади її на інгредієнти, оціни їх пропорції, і лише потім видай загальну цифру для всієї страви.
2. Оцінка ваги: Уважно дивись на розмір порції відносно тарілки чи інших предметів у кадрі. За замовчуванням вважай стандартну порцію супу/другого за 250-300г, якщо не видно іншого.
3. Точність макросів: Сума білків, жирів та вуглеводів повинна математично відповідати загальній калорійності (1г білка = 4 ккал, 1г вуглеводів = 4 ккал, 1г жиру = 9 ккал).
4. Кілька страв: Якщо на фото є і суп, і хліб, і напій — розділи їх на окремі об'єкти в масиві "items".
5. Не їжа: Якщо на фото абсолютно немає їжі (наприклад, стіл, людина, комп'ютер, кімната), поверни JSON з єдиним полем: {"error": "На фото не знайдено їжі. Будь ласка, сфотографуйте вашу страву."}

ФОРМАТ ВІДПОВІДІ:
Ти повинен повернути ТІЛЬКИ валідний JSON. Жодних вступних слів, жодних блоків ```json ... ```. Лише чистий JSON за такою структурою:

{
  "summary_text": "Короткий, дружній опис того, що ти побачив (наприклад: 'Я бачу велику порцію узбецького плову та свіжий салат з помідорів. Виглядає дуже смачно!')",
  "items": [
    {
      "name": "Плов з яловичиною",
      "grams": 300,
      "calories": 540,
      "protein": 18.0,
      "fat": 22.5,
      "carbs": 65.0
    }
  ],
  "total": {
    "calories": 540,
    "protein": 18.0,
    "fat": 22.5,
    "carbs": 65.0
  }
}"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt_text},
                {"inline_data": {"mime_type": "image/jpeg", "data": base64_image}}
            ]
        }],
        "generationConfig": {"response_mime_type": "application/json"}
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"📡 Sending request to {MODEL_NAME}...")
            response = await client.post(url, headers=headers, json=payload, timeout=60.0)
            
            if response.status_code == 200:
                data = response.json()
                text = data['candidates'][0]['content']['parts'][0]['text']
                # Оскільки ми вимагаємо чистий JSON, json.loads спрацює без помилок
                return json.loads(text)
            
            # Якщо ліміт вичерпано
            if response.status_code == 429:
                return {
                    "error": "Ліміт запитів на сьогодні вичерпано.", 
                    "limit_reached": True
                }
            
            print(f"🔴 AI Error: {response.status_code} - {response.text}")
            return {"error": f"Помилка Google: {response.status_code}"}

        except Exception as e:
            print(f"🔴 AI Exception: {e}")
            return {"error": "Помилка з'єднання з ІІ."}
