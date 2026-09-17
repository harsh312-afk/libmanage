from typing import List, Dict, Any
from pydantic import BaseModel

class CategoryStats(BaseModel):
    category: str
    count: int

class RecentBorrowActivity(BaseModel):
    id: int
    book_title: str
    user_name: str
    action: str  # "borrowed", "returned", "overdue"
    date: str
    badge_type: str

class DashboardStats(BaseModel):
    total_books: int
    total_copies: int
    available_copies: int
    issued_books: int
    total_members: int
    overdue_loans: int
    total_fines_pending: float
    total_fines_collected: float
    category_distribution: List[CategoryStats]
    recent_activities: List[RecentBorrowActivity]
