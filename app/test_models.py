import os
import google.generativeai as genai
from dotenv import load_dotenv

# Загружаем твой ключ
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Ключ не найден в .env!")
else:
    print("✅ Ключ найден, стучимся в Google...\n")
    genai.configure(api_key=api_key)
    
    try:
        print("🔥 ДОСТУПНЫЕ ТЕБЕ МОДЕЛИ:")
        models_found = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                models_found = True
                
        if not models_found:
            print("❌ Твой ключ рабочий, но ему не выдали доступ ни к одной текстовой модели!")
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")