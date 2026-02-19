import re

class TextParser:
    @staticmethod
    def extract_weight(query: str) -> int:
        # Шукаємо "400г", "350 грам", "200 g"
        match = re.search(r'(\d+)\s*(г|г|грам|gram|g)', query.lower())
        if match:
            return int(match.group(1))
        
        # Обробка розмірів
        if "великий" in query.lower() or "велика" in query.lower(): return 500
        if "маленький" in query.lower() or "маленька" in query.lower(): return 200
        return 300 # Дефолтна вага

    @staticmethod
    def get_keywords(query: str) -> list:
        # Простий токенізатор для fallback
        words = re.findall(r'\w+', query.lower())
        stop_words = {'з', 'і', 'та', 'в', 'на', 'для', 'большая', 'маленький'}
        return [w for w in words if w not in stop_words and not w.isdigit()]