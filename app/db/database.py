import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

# Шукаємо хмарну базу. Якщо її немає, використовуємо локальну SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fitness.db")

# Налаштування двигуна (engine)
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Це для локальної SQLite
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Це для хмарного PostgreSQL (Render/Neon)
    # SQLAlchemy вимагає 'postgresql://', а іноді хмарні сервіси дають 'postgres://', тому робимо фікс:
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # 🔥 Магия 1: Проверяет, жива ли база, перед каждым запросом
    pool_recycle=1800    # 🔥 Магия 2: Переподключается каждые 30 минут, чтобы база не обрывала связь
)   

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()