from app.core.utils import utc_now
from datetime import datetime, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.book import Book
from app.models.user import User
from app.models.borrow import BorrowRecord, FineRecord

def calculate_fine_details(record: BorrowRecord) -> Tuple[bool, int, float]:
    check_time = record.return_date if record.return_date else utc_now()
    diff = check_time.date() - record.due_date.date()
    days_overdue = max(0, diff.days)
    is_overdue = days_overdue > 0
    calculated_fine = round(days_overdue * settings.FINE_PER_DAY, 2)
    return is_overdue, days_overdue, calculated_fine

def issue_book(
    db: Session,
    user_id: int,
    book_id: int,
    loan_days: int = settings.DEFAULT_LOAN_DAYS,
    notes: Optional[str] = None
) -> BorrowRecord:
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active patron not found")

    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book.available_copies <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No copies available for borrowing")

    # Check active borrowings count
    active_count = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == user_id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()

    if active_count >= settings.MAX_BOOKS_PER_MEMBER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member reached maximum limit of {settings.MAX_BOOKS_PER_MEMBER} borrowed books"
        )

    # Check if user already has an active copy of this exact book
    existing_loan = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == user_id,
        BorrowRecord.book_id == book_id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).first()
    if existing_loan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member already has an active loan for this book"
        )

    # Issue book
    now = utc_now()
    due = now + timedelta(days=loan_days if loan_days > 0 else settings.DEFAULT_LOAN_DAYS)
    
    book.available_copies -= 1
    
    borrow = BorrowRecord(
        user_id=user_id,
        book_id=book_id,
        borrow_date=now,
        due_date=due,
        renewal_count=0,
        status="borrowed",
        notes=notes
    )
    db.add(borrow)
    db.commit()
    db.refresh(borrow)
    return borrow

def return_book(
    db: Session,
    borrow_id: int,
    notes: Optional[str] = None,
    pay_fine_now: bool = False
) -> BorrowRecord:
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow record not found")

    if record.status == "returned":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Book is already returned")

    now = utc_now()
    record.return_date = now
    record.status = "returned"
    if notes:
        record.notes = (record.notes or "") + f" [Return note: {notes}]"

    # Fine calculation
    is_overdue, days_overdue, fine_amount = calculate_fine_details(record)
    if fine_amount > 0:
        fine = record.fine
        if not fine:
            fine = FineRecord(
                borrow_id=record.id,
                amount=fine_amount,
                status="paid" if pay_fine_now else "pending",
                created_at=now,
                paid_at=now if pay_fine_now else None
            )
            db.add(fine)
        else:
            fine.amount = fine_amount
            if pay_fine_now:
                fine.status = "paid"
                fine.paid_at = now

    # Restock book copy
    book = db.query(Book).filter(Book.id == record.book_id).first()
    if book and book.available_copies < book.total_copies:
        book.available_copies += 1

    db.commit()
    db.refresh(record)
    return record

def renew_book(
    db: Session,
    borrow_id: int,
    additional_days: int = settings.DEFAULT_LOAN_DAYS
) -> BorrowRecord:
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow record not found")

    if record.status != "borrowed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active non-overdue loans can be renewed")

    if record.renewal_count >= settings.MAX_RENEWALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum renewal limit of {settings.MAX_RENEWALS} reached"
        )

    is_overdue, _, _ = calculate_fine_details(record)
    if is_overdue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Overdue loans cannot be renewed. Please return the book or settle the fine."
        )

    record.due_date = record.due_date + timedelta(days=additional_days)
    record.renewal_count += 1
    db.commit()
    db.refresh(record)
    return record

def pay_fine(db: Session, borrow_id: int) -> FineRecord:
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow record not found")

    fine = record.fine
    if not fine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No fine recorded for this loan")

    fine.status = "paid"
    fine.paid_at = utc_now()
    db.commit()
    db.refresh(fine)
    return fine
