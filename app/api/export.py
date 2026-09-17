from app.core.utils import utc_now
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.book import Book
from app.models.borrow import BorrowRecord
from app.core.security import require_admin
from app.services.circulation_service import calculate_fine_details

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("/books")
def export_books_csv(db: Session = Depends(get_db), _admin = Depends(require_admin)):
    books = db.query(Book).order_by(Book.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "ISBN", "Title", "Author", "Category", "Year", "Total Copies", "Available Copies", "Shelf Location"])

    for b in books:
        writer.writerow([
            b.id,
            b.isbn,
            b.title,
            b.author,
            b.category,
            b.publication_year or "",
            b.total_copies,
            b.available_copies,
            b.shelf_location
        ])

    csv_data = output.getvalue()
    filename = f"books_catalog_{utc_now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/borrows")
def export_borrows_csv(db: Session = Depends(get_db), _admin = Depends(require_admin)):
    records = db.query(BorrowRecord).order_by(BorrowRecord.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Loan ID", "Member Name", "Card Number", "Book Title", "ISBN",
        "Borrow Date", "Due Date", "Return Date", "Status", "Days Overdue", "Fine Amount ($)", "Fine Status"
    ])

    for r in records:
        is_od, days_od, fine_amt = calculate_fine_details(r)
        fine_status = r.fine.status if r.fine else ("Pending" if fine_amt > 0 else "None")
        writer.writerow([
            r.id,
            r.user.name if r.user else "N/A",
            r.user.card_number if r.user else "N/A",
            r.book.title if r.book else "N/A",
            r.book.isbn if r.book else "N/A",
            r.borrow_date.strftime("%Y-%m-%d %H:%M"),
            r.due_date.strftime("%Y-%m-%d"),
            r.return_date.strftime("%Y-%m-%d %H:%M") if r.return_date else "",
            r.status,
            days_od,
            f"{fine_amt:.2f}",
            fine_status
        ])

    csv_data = output.getvalue()
    filename = f"borrow_records_{utc_now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
