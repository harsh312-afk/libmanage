from app.core.utils import utc_now
import random
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.borrow import BorrowRecord
from app.schemas.user_schemas import UserCreate, UserLogin, UserOut, Token, UserUpdate
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def generate_card_number(db: Session) -> str:
    year = utc_now().year
    while True:
        num = random.randint(1000, 9999)
        card = f"LIB-{year}-{num}"
        if not db.query(User).filter(User.card_number == card).first():
            return card

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    card_number = user_in.card_number
    if not card_number:
        card_number = generate_card_number(db)
    else:
        if db.query(User).filter(User.card_number == card_number).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Library card number is already registered"
            )

    new_user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        role=user_in.role if user_in.role in ["admin", "member"] else "member",
        card_number=card_number,
        phone=user_in.phone,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    user_out = UserOut.model_validate(new_user)
    user_out.active_borrows_count = 0

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact the administrator."
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    
    active_borrows = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == user.id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()

    user_out = UserOut.model_validate(user)
    user_out.active_borrows_count = active_borrows

    return Token(access_token=token, token_type="bearer", user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    active_borrows = db.query(BorrowRecord).filter(
        BorrowRecord.user_id == current_user.id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()
    user_out = UserOut.model_validate(current_user)
    user_out.active_borrows_count = active_borrows
    return user_out

@router.put("/profile", response_model=UserOut)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.password:
        current_user.hashed_password = hash_password(user_update.password)

    db.commit()
    db.refresh(current_user)
    user_out = UserOut.model_validate(current_user)
    return user_out
