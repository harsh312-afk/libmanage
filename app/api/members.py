from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.borrow import BorrowRecord
from app.schemas.user_schemas import UserCreate, UserUpdate, UserOut
from app.core.security import require_admin, hash_password, get_current_user
from app.api.auth import generate_card_number

router = APIRouter(prefix="/api/members", tags=["Members"])

@router.get("", response_model=List[UserOut])
def list_members(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin)
):
    query = db.query(User).filter(User.role == "member")
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (User.name.ilike(term)) |
            (User.email.ilike(term)) |
            (User.card_number.ilike(term)) |
            (User.phone.ilike(term))
        )
    members = query.order_by(User.id.desc()).all()

    results = []
    for m in members:
        active_count = db.query(BorrowRecord).filter(
            BorrowRecord.user_id == m.id,
            BorrowRecord.status.in_(["borrowed", "overdue"])
        ).count()
        out = UserOut.model_validate(m)
        out.active_borrows_count = active_count
        results.append(out)

    return results

@router.get("/{member_id}", response_model=UserOut)
def get_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin" and current_user.id != member_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    active_count = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == member.id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()

    out = UserOut.model_validate(member)
    out.active_borrows_count = active_count
    return out

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_member(
    member_in: UserCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin)
):
    if db.query(User).filter(User.email == member_in.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    card_number = member_in.card_number or generate_card_number(db)
    if db.query(User).filter(User.card_number == card_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card number already registered"
        )

    new_member = User(
        name=member_in.name,
        email=member_in.email.lower(),
        hashed_password=hash_password(member_in.password),
        role="member",
        card_number=card_number,
        phone=member_in.phone,
        is_active=True
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    out = UserOut.model_validate(new_member)
    out.active_borrows_count = 0
    return out

@router.put("/{member_id}", response_model=UserOut)
def update_member(
    member_id: int,
    update_in: UserUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin)
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if update_in.email and update_in.email.lower() != member.email:
        if db.query(User).filter(User.email == update_in.email.lower()).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
        member.email = update_in.email.lower()

    if update_in.name is not None:
        member.name = update_in.name
    if update_in.phone is not None:
        member.phone = update_in.phone
    if update_in.role is not None and update_in.role in ["admin", "member"]:
        member.role = update_in.role
    if update_in.is_active is not None:
        member.is_active = update_in.is_active
    if update_in.password:
        member.hashed_password = hash_password(update_in.password)

    db.commit()
    db.refresh(member)

    active_count = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == member.id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()

    out = UserOut.model_validate(member)
    out.active_borrows_count = active_count
    return out

@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin)
):
    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    active_loans = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == member_id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()

    if active_loans > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete member with {active_loans} unreturned books. Books must be returned first."
        )

    db.delete(member)
    db.commit()
    return None
