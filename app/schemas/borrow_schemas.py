from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.book_schemas import BookOut
from app.schemas.user_schemas import UserOut

class FineOut(BaseModel):
    id: int
    borrow_id: int
    amount: float
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BorrowCreate(BaseModel):
    user_id: int
    book_id: int
    loan_days: Optional[int] = 14
    notes: Optional[str] = None

class BorrowReturn(BaseModel):
    notes: Optional[str] = None
    pay_fine_now: bool = False

class BorrowOut(BaseModel):
    id: int
    user_id: int
    book_id: int
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    renewal_count: int
    status: str
    notes: Optional[str] = None
    fine: Optional[FineOut] = None

    model_config = ConfigDict(from_attributes=True)

class BorrowWithDetailsOut(BorrowOut):
    user: UserOut
    book: BookOut
    is_overdue: bool = False
    days_overdue: int = 0
    calculated_fine: float = 0.0

    model_config = ConfigDict(from_attributes=True)
