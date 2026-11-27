from typing import Literal
from pydantic import BaseModel, Field
class Credentials(BaseModel):
    email: str = Field(min_length=3,max_length=254,pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    password: str = Field(min_length=8,max_length=128)
class ImageInput(BaseModel):
    image: str = Field(max_length=12000100)
class Symptoms(BaseModel):
    symptoms: list[str] = Field(min_length=1,max_length=30)
class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    text: str = Field(min_length=1,max_length=4000)
class Question(BaseModel):
    question: str = Field(min_length=1,max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list,max_length=12)
class Milk(BaseModel):
    animal: str = Field(min_length=1,max_length=100)
    litres: float = Field(ge=0,le=100)
