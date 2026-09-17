from app.core.utils import utc_now
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class BorrowRecord(Base):
    __tablename__ = "borrow_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    borrow_date = Column(DateTime, default=utc_now, nullable=False)
    due_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime, nullable=True)
    renewal_count = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="borrowed", nullable=False)  # "borrowed", "returned", "overdue"
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="borrows")
    book = relationship("Book", back_populates="borrows")
    fine = relationship("FineRecord", back_populates="borrow", uselist=False, cascade="all, delete-orphan")


class FineRecord(Base):
    __tablename__ = "fine_records"

    id = Column(Integer, primary_key=True, index=True)
    borrow_id = Column(Integer, ForeignKey("borrow_records.id"), unique=True, nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # "pending", "paid", "waived"
    created_at = Column(DateTime, default=utc_now, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    borrow = relationship("BorrowRecord", back_populates="fine")
