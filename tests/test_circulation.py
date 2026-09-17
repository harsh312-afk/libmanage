from app.core.utils import utc_now
from datetime import datetime, timedelta
from app.models.book import Book
from app.models.borrow import BorrowRecord

def test_issue_and_return_book(client, admin_headers, test_member, db):
    # Create test book
    book = Book(
        isbn="978-9999999999",
        title="Test Circulation Book",
        author="Tester",
        category="Test",
        total_copies=2,
        available_copies=2
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    # Issue book
    issue_payload = {
        "user_id": test_member.id,
        "book_id": book.id,
        "loan_days": 14,
        "notes": "Testing circulation"
    }
    res_issue = client.post("/api/borrows", json=issue_payload, headers=admin_headers)
    assert res_issue.status_code == 201
    loan_data = res_issue.json()
    assert loan_data["status"] == "borrowed"
    borrow_id = loan_data["id"]

    # Verify stock decremented
    db.refresh(book)
    assert book.available_copies == 1

    # Attempting to issue the same book again to the same user should fail
    res_duplicate = client.post("/api/borrows", json=issue_payload, headers=admin_headers)
    assert res_duplicate.status_code == 400

    # Return book
    res_return = client.post(f"/api/borrows/{borrow_id}/return", json={}, headers=admin_headers)
    assert res_return.status_code == 200
    assert res_return.json()["status"] == "returned"

    # Verify stock restored
    db.refresh(book)
    assert book.available_copies == 2

def test_overdue_fine_calculation(client, admin_headers, test_member, db):
    book = Book(
        isbn="978-8888888888",
        title="Overdue Book",
        author="Tester",
        category="Test",
        total_copies=1,
        available_copies=0
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    # Create an artificially overdue borrow record (5 days overdue)
    now = utc_now()
    borrow = BorrowRecord(
        user_id=test_member.id,
        book_id=book.id,
        borrow_date=now - timedelta(days=19),
        due_date=now - timedelta(days=5),
        status="borrowed"
    )
    db.add(borrow)
    db.commit()
    db.refresh(borrow)

    # List borrows and check overdue calculation
    res = client.get(f"/api/borrows?user_id={test_member.id}", headers=admin_headers)
    assert res.status_code == 200
    loans = res.json()
    target_loan = next((l for l in loans if l["id"] == borrow.id), None)
    assert target_loan is not None
    assert target_loan["is_overdue"] is True
    assert target_loan["days_overdue"] >= 5
    assert target_loan["calculated_fine"] >= 2.50  # 5 * 0.50

    # Return book with settle fine
    res_return = client.post(f"/api/borrows/{borrow.id}/return", json={"pay_fine_now": True}, headers=admin_headers)
    assert res_return.status_code == 200
    returned_loan = res_return.json()
    assert returned_loan["status"] == "returned"
    assert returned_loan["fine"]["status"] == "paid"
    assert returned_loan["fine"]["amount"] >= 2.50
