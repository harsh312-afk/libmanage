from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class BookBase(BaseModel):
    isbn: str
    title: str
    author: str
    category: str
    publication_year: Optional[int] = None
    total_copies: int = Field(default=1, ge=1)
    shelf_location: str = "Section A"
    description: Optional[str] = None
    cover_url: Optional[str] = None

class BookCreate(BookBase):
    available_copies: Optional[int] = None

class BookUpdate(BaseModel):
    isbn: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    publication_year: Optional[int] = None
    total_copies: Optional[int] = Field(default=None, ge=1)
    available_copies: Optional[int] = Field(default=None, ge=0)
    shelf_location: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None

class BookOut(BookBase):
    id: int
    available_copies: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BookListResponse(BaseModel):
    total: int
    page: int
    limit: int
    books: List[BookOut]
