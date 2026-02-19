import json
import os
import base64
import httpx
from fastapi import UploadFile

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

# --- 🔥 AI VISION: GEMINI 2.5 FLASH (FIXED) ---

# Твій ключ
API_KEY = "AIzaSyDgSUNyxFs5uJ_nmD3Yx2wM_uqCJ08ZskE" 
MODEL_NAME = "gemini-2.5-flash"

async def analyze_food_with_gemini(image_bytes: bytes):
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
    except:
        return {"error": "Помилка обробки файлу"}

    # Прямий URL до моделі
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"
    
    # Авторизація через заголовок (надійніше для ngrok)
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
    }

    payload = {
        "contents": [{
            "parts": [
                {"text": """Ти професійний дієтолог. Проаналізуй це фото їжі.
                ВЕРНИ ВІДПОВІДЬ СТРОГО У ФОРМАТІ JSON (без markdown):
                {
                    "items": [{"name": "Назва", "grams": 100, "calories": 100, "protein": 0, "fat": 0, "carbs": 0}],
                    "total": {"calories": 100, "protein": 0, "fat": 0, "carbs": 0},
                    "summary_text": "Опис"
                }
                Мова: Українська."""},
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
                return json.loads(text)
            
            # Якщо ліміт вичерпано
            if response.status_code == 429:
                return {
                    "error": "Ліміт 20 запитів на сьогодні вичерпано.", 
                    "limit_reached": True
                }
            
            print(f"🔴 AI Error: {response.status_code} - {response.text}")
            return {"error": f"Помилка Google: {response.status_code}"}

        except Exception as e:
            print(f"🔴 AI Exception: {e}")
            return {"error": "Помилка з'єднання."}