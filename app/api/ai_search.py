from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import database, models
from app.api.auth import get_current_user
from app.services.ai_vision import analyze_food_with_gemini  # вже є у проекті
from pydantic import BaseModel
import json, re

router = APIRouter(prefix="/ai-search", tags=["AI Search"])

class ParseMacrosRequest(BaseModel):
    text: str

@router.post("/parse-macros")        
async def parse_macros_from_text(
    payload: ParseMacrosRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Приймає текстовий опис страви і повертає БЖВ через Gemini.
    """
    if not payload.text or len(payload.text.strip()) < 2:
        raise HTTPException(status_code=400, detail="Текст занадто короткий")

    try:
        # Використовуємо вже існуючий Gemini-сервіс, але передаємо текст як "підказку"
        result = await _analyze_text_with_gemini(payload.text.strip())

        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 AI Search Error: {e}")
        raise HTTPException(status_code=500, detail="Помилка аналізу")


async def _analyze_text_with_gemini(text: str) -> dict:
    """
    Окрема функція: відправляє текстовий запит до Gemini і парсить відповідь.
    """
    import google.generativeai as genai
    from app.core.config import settings

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
Ти — дієтолог. Користувач описав страву: "{text}"

Визнач:
1. Стандартну назву страви (українською)
2. КБЖВ на 100 грамів або на вказану порцію

Відповідь ТІЛЬКИ у форматі JSON (без markdown, без пояснень):
{{
  "name": "Назва страви",
  "calories": 250,
  "protein": 20.5,
  "fat": 10.0,
  "carbs": 15.0,
  "grams": 100
}}

Якщо у тексті вказана вага (наприклад "150г"), то "grams" = ця вага, а КБЖВ = для цієї ваги.
Якщо страву неможливо розпізнати — поверни: {{"error": "Не вдалося розпізнати страву"}}
"""

        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Видаляємо markdown-обгортку якщо є
        raw = re.sub(r"```json|```", "", raw).strip()

        data = json.loads(raw)
        return data

    except json.JSONDecodeError:
        return {"error": "AI повернув некоректний формат"}
    except Exception as e:
        print(f"Gemini text error: {e}")
        return {"error": str(e)}