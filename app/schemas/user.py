from pydantic import BaseModel, EmailStr
from typing import Optional

# Это мы требуем от юзера при регистрации
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    goal: Optional[str] = "maintain"

# Это мы показываем юзеру в ответ (пароль скрываем!)
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    goal: str

    class Config:
        from_attributes = True