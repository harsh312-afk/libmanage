from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.borrow import BorrowRecord
from app.models.user import User
from app.schemas.borrow_schemas import (
    BorrowCreate,
    BorrowReturn,
    BorrowWithDetailsOut,
    FineOut
)
from app.schemas.book_schemas import BookOut
from app.schemas.user_schemas import UserOut
from app.core.security import get_current_user, require_admin
from app.services.circulation_service import (
    issue_book,
    return_book,
    renew_book,
    pay_fine,
    calculate_fine_details
)

router = APIRouter(prefix="/api/borrows", tags=["Circulation"])

def build_borrow_detail(record: BorrowRecord) -> BorrowWithDetailsOut:
    is_od, days_od, calc_fine = calculate_fine_details(record)
    user_out = UserOut.model_validate(record.user)
    book_out = BookOut.model_validate(record.book)

    fine_out = None
    if record.fine:
        fine_out = FineOut.model_validate(record.fine)

    return BorrowWithDetailsOut(
        id=record.id,
        user_id=record.user_id,
        book_id=record.book_id,
        borrow_date=record.borrow_date,
        due_date=record.due_date,
        return_date=record.return_date,
        renewal_count=record.renewal_count,
        status=record.status,
        notes=record.notes,
        fine=fine_out,
        user=user_out,
        book=book_out,
        is_overdue=is_od,
        days_overdue=days_od,
        calculated_fine=calc_fine
    )

@router.get("", response_model=List[BorrowWithDetailsOut])
def list_borrows(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: borrowed, returned, overdue, all"),
    user_id: Optional[int] = Query(None, description="Filter by patron ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(BorrowRecord)

    # Patrons can only view their own borrow records
    if current_user.role != "admin":
        query = query.filter(BorrowRecord.user_id == current_user.id)
    elif user_id:
        query = query.filter(BorrowRecord.user_id == user_id)

    records = query.order_by(BorrowRecord.id.desc()).all()
    results = [build_borrow_detail(r) for r in records]

    # Filter after building details for live overdue detection
    if status_filter and status_filter != "all":
        if status_filter == "overdue":
            results = [r for r in results if r.is_overdue and r.status != "returned"]
        elif status_filter == "borrowed":
            results = [r for r in results if r.status == "borrowed" and not r.is_overdue]
        elif status_filter == "returned":
            results = [r for r in results if r.status == "returned"]

    start = (page - 1) * limit
    return results[start:start + limit]

@router.post("", response_model=BorrowWithDetailsOut, status_code=status.HTTP_201_CREATED)
def checkout_book(
    borrow_in: BorrowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If not admin, patron can only issue books to themselves
    target_user_id = borrow_in.user_id
    if current_user.role != "admin":
        target_user_id = current_user.id

    record = issue_book(
        db=db,
        user_id=target_user_id,
        book_id=borrow_in.book_id,
        loan_days=borrow_in.loan_days or 14,
        notes=borrow_in.notes
    )
    return build_borrow_detail(record)

@router.post("/{borrow_id}/return", response_model=BorrowWithDetailsOut)
def checkin_book(
    borrow_id: int,
    return_in: Optional[BorrowReturn] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan record not found")

    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to return this loan")

    notes = return_in.notes if return_in else None
    pay_fine_now = return_in.pay_fine_now if return_in else False

    updated_record = return_book(db=db, borrow_id=borrow_id, notes=notes, pay_fine_now=pay_fine_now)
    return build_borrow_detail(updated_record)

@router.post("/{borrow_id}/renew", response_model=BorrowWithDetailsOut)
def extend_loan(
    borrow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan record not found")

    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to renew this loan")

    updated_record = renew_book(db=db, borrow_id=borrow_id)
    return build_borrow_detail(updated_record)

@router.post("/{borrow_id}/pay-fine", response_model=FineOut)
def settle_fine(
    borrow_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    fine = pay_fine(db=db, borrow_id=borrow_id)
    return FineOut.model_validate(fine)
