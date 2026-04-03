import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# Загружаем скрытые переменные
load_dotenv()

# Теперь берем ключ из безопасного места. 
# Если его там нет (например, ты забыл добавить), используем запасной. 
SECRET_KEY = "kinetic_app_super_secret_2026_key"
print(f"🚀 СЕРВЕР ЗАПУЩЕНО З КЛЮЧЕМ: {SECRET_KEY[-4:]}") # Побачимо останні 4 символи
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- 🔥 САМЕ ЦІЄЇ ФУНКЦІЇ НЕ ВИСТАЧАЛО ---
def decode_access_token(token: str):
    try:
        # Цей принт покаже нам токен у терміналі
        print(f"DEBUG: Декодую токен: {token[:10]}...") 
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print(f"🔴 Помилка декодування: {e}") # Тут ми побачимо причину (expired або invalid)
        return None