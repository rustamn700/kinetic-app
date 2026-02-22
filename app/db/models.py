from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, Date
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.db.database import Base

class User(Base):
    
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # --- 🔥 НОВІ ПОЛЯ ПРОФІЛЮ ---
    gender = Column(String, default="male")       # "male" / "female"
    age = Column(Integer, default=25)
    weight = Column(Float, default=70.0)
    height = Column(Integer, default=175)
    activity_level = Column(Float, default=1.2)   # Коефіцієнт активності
    
    daily_goal = Column(Integer, default=2500)    # Розраховується автоматично
    goal_type = Column(String, default="maintain") # "lose", "maintain", "gain"

    # --- 📸 ЛІМІТИ НА ФОТО (ДОДАНО) ---
    photo_count = Column(Integer, default=0)      # Скільки фото зробив сьогодні
    last_photo_date = Column(Date, nullable=True) # Коли останній раз фоткав

    meals = relationship("Meal", back_populates="owner")
    water_logs = relationship("WaterIntake", back_populates="user")
    favorites = relationship("UserFavorite", back_populates="user")
    custom_products = relationship("CustomProduct", back_populates="owner")

# --- Связь с историей веса (ДОБАВЛЕНО) ---
    weight_history = relationship("WeightHistory", back_populates="user")

class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    grams = Column(Integer)
    total_kcal = Column(Integer)
    total_protein = Column(Float, default=0.0)
    total_fats = Column(Float, default=0.0)
    total_carbs = Column(Float, default=0.0)
    cuisine = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    ingredients = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.now)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="meals")

class WaterIntake(Base):
    __tablename__ = "water_intake"
    id = Column(Integer, primary_key=True, index=True)
    amount_ml = Column(Integer)
    timestamp = Column(DateTime, default=datetime.now)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="water_logs")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    icon = Column(String, default="📦")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    children = relationship("Category", backref=backref('parent', remote_side=[id]))
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    calories = Column(Integer)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)
    sugar = Column(Float, default=0.0)
    fiber = Column(Float, default=0.0)
    unit = Column(String, default="г")
    weight_per_piece = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="products")

class CustomProduct(Base):
    __tablename__ = "custom_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    calories = Column(Integer)
    protein = Column(Float, default=0)
    fat = Column(Float, default=0)
    carbs = Column(Float, default=0)
    
    barcode = Column(String, index=True, nullable=True) 

    owner = relationship("User", back_populates="custom_products")

class UserFavorite(Base):
    __tablename__ = "user_favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    user = relationship("User", back_populates="favorites")
    product = relationship("Product")

class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    kcal = Column(Integer)
    protein = Column(Float)
    fats = Column(Float)
    carbs = Column(Float)
    sugar = Column(Float, default=0.0)
    fiber = Column(Float, default=0.0)

class Dish(Base):
    __tablename__ = "dishes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    total_weight = Column(Integer, default=0)
    total_kcal = Column(Integer, default=0)
    total_protein = Column(Float, default=0.0)
    total_fats = Column(Float, default=0.0)
    total_carbs = Column(Float, default=0.0)
    ingredients = relationship("DishIngredient", back_populates="dish")

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"
    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    weight_g = Column(Integer)
    dish = relationship("Dish", back_populates="ingredients")
    ingredient = relationship("Ingredient")

class WeightHistory(Base):
    __tablename__ = "weight_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    weight = Column(Float)
    date = Column(Date, default=datetime.now) # Сохраняем дату взвешивания
    
    user = relationship("User", back_populates="weight_history")
    