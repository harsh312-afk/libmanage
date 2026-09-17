from datetime import datetime
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.user import User
from app.models.borrow import BorrowRecord, FineRecord
from app.schemas.analytics_schemas import DashboardStats, CategoryStats, RecentBorrowActivity
from app.services.circulation_service import calculate_fine_details

def get_dashboard_stats(db: Session) -> DashboardStats:
    total_books = db.query(func.count(Book.id)).scalar() or 0
    total_copies = db.query(func.sum(Book.total_copies)).scalar() or 0
    available_copies = db.query(func.sum(Book.available_copies)).scalar() or 0
    issued_books = total_copies - available_copies
    if issued_books < 0:
        issued_books = 0

    total_members = db.query(func.count(User.id)).filter(User.role == "member").scalar() or 0

    # Overdue loans check
    active_borrows = db.query(BorrowRecord).filter(BorrowRecord.status.in_(["borrowed", "overdue"])).all()
    overdue_count = 0
    for b in active_borrows:
        is_overdue, _, _ = calculate_fine_details(b)
        if is_overdue:
            overdue_count += 1

    # Fines stats
    total_fines_pending = db.query(func.sum(FineRecord.amount)).filter(FineRecord.status == "pending").scalar() or 0.0
    total_fines_collected = db.query(func.sum(FineRecord.amount)).filter(FineRecord.status == "paid").scalar() or 0.0

    # Category breakdown
    cat_counts = (
        db.query(Book.category, func.count(Book.id))
        .group_by(Book.category)
        .order_by(func.count(Book.id).desc())
        .all()
    )
    categories = [CategoryStats(category=cat, count=cnt) for cat, cnt in cat_counts]

    # Recent activities (last 8)
    recent_borrows = (
        db.query(BorrowRecord)
        .order_by(BorrowRecord.borrow_date.desc())
        .limit(8)
        .all()
    )
    activities: List[RecentBorrowActivity] = []
    for r in recent_borrows:
        is_od, _, _ = calculate_fine_details(r)
        if r.status == "returned":
            action = "Returned"
            badge = "success"
            date_str = r.return_date.strftime("%b %d, %Y") if r.return_date else ""
        elif is_od:
            action = "Overdue"
            badge = "danger"
            date_str = f"Due {r.due_date.strftime('%b %d, %Y')}"
        else:
            action = "Borrowed"
            badge = "primary"
            date_str = f"Due {r.due_date.strftime('%b %d, %Y')}"

        activities.append(
            RecentBorrowActivity(
                id=r.id,
                book_title=r.book.title if r.book else "Unknown Book",
                user_name=r.user.name if r.user else "Unknown Patron",
                action=action,
                date=date_str,
                badge_type=badge
            )
        )

    return DashboardStats(
        total_books=total_books,
        total_copies=total_copies,
        available_copies=available_copies,
        issued_books=issued_books,
        total_members=total_members,
        overdue_loans=overdue_count,
        total_fines_pending=round(float(total_fines_pending), 2),
        total_fines_collected=round(float(total_fines_collected), 2),
        category_distribution=categories,
        recent_activities=activities
    )
