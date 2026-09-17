from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.book import Book
from app.models.borrow import BorrowRecord
from app.schemas.book_schemas import BookCreate, BookUpdate, BookOut, BookListResponse
from app.core.security import require_admin

router = APIRouter(prefix="/api/books", tags=["Books"])

@router.get("", response_model=BookListResponse)
def list_books(
    q: Optional[str] = Query(None, description="Search by title, author, or ISBN"),
    category: Optional[str] = Query(None, description="Filter by genre / category"),
    available_only: bool = Query(False, description="Only show available books"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Book)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_pattern),
                Book.author.ilike(search_pattern),
                Book.isbn.ilike(search_pattern),
                Book.description.ilike(search_pattern)
            )
        )

    if category and category.strip():
        query = query.filter(Book.category == category.strip())

    if available_only:
        query = query.filter(Book.available_copies > 0)

    total = query.count()
    offset = (page - 1) * limit
    books = query.order_by(Book.id.desc()).offset(offset).limit(limit).all()

    return BookListResponse(
        total=total,
        page=page,
        limit=limit,
        books=[BookOut.model_validate(b) for b in books]
    )

@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Book.category).distinct().order_by(Book.category).all()
    return [c[0] for c in categories if c[0]]

@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return BookOut.model_validate(book)

@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin)
):
    existing = db.query(Book).filter(Book.isbn == book_in.isbn.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A book with this ISBN already exists"
        )

    total_copies = book_in.total_copies
    available = book_in.available_copies if book_in.available_copies is not None else total_copies

    book = Book(
        isbn=book_in.isbn.strip(),
        title=book_in.title.strip(),
        author=book_in.author.strip(),
        category=book_in.category.strip(),
        publication_year=book_in.publication_year,
        total_copies=total_copies,
        available_copies=available,
        shelf_location=book_in.shelf_location.strip(),
        description=book_in.description,
        cover_url=book_in.cover_url
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return BookOut.model_validate(book)

@router.put("/{book_id}", response_model=BookOut)
def update_book(
    book_id: int,
    book_in: BookUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    if book_in.isbn and book_in.isbn.strip() != book.isbn:
        existing = db.query(Book).filter(Book.isbn == book_in.isbn.strip()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A book with this ISBN already exists"
            )
        book.isbn = book_in.isbn.strip()

    if book_in.title is not None:
        book.title = book_in.title.strip()
    if book_in.author is not None:
        book.author = book_in.author.strip()
    if book_in.category is not None:
        book.category = book_in.category.strip()
    if book_in.publication_year is not None:
        book.publication_year = book_in.publication_year
    if book_in.shelf_location is not None:
        book.shelf_location = book_in.shelf_location.strip()
    if book_in.description is not None:
        book.description = book_in.description
    if book_in.cover_url is not None:
        book.cover_url = book_in.cover_url

    if book_in.total_copies is not None:
        diff = book_in.total_copies - book.total_copies
        book.total_copies = book_in.total_copies
        book.available_copies = max(0, book.available_copies + diff)

    if book_in.available_copies is not None:
        book.available_copies = min(book_in.available_copies, book.total_copies)

    db.commit()
    db.refresh(book)
    return BookOut.model_validate(book)

@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    # Check if there are active loans
    active_borrows = db.query(BorrowRecord).filter(
        BorrowRecord.book_id == book_id,
        BorrowRecord.status.in_(["borrowed", "overdue"])
    ).count()
    if active_borrows > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete book. There are currently {active_borrows} active loans for this title."
        )

    db.delete(book)
    db.commit()
    return None
