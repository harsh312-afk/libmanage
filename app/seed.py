from app.core.utils import utc_now
from datetime import datetime, timedelta
from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.book import Book
from app.models.borrow import BorrowRecord, FineRecord
from app.core.security import hash_password

def seed_data():
    init_db()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains records. Skipping seed.")
            return

        print("Seeding initial library dataset...")

        # 1. Create Admin
        admin = User(
            name="Chief Librarian Eleanor",
            email="admin@library.com",
            hashed_password=hash_password("admin123"),
            role="admin",
            card_number="LIB-ADMIN-001",
            phone="+1 555-0199",
            is_active=True
        )
        db.add(admin)

        # 2. Create Members
        members = [
            User(
                name="Alice Johnson",
                email="alice@example.com",
                hashed_password=hash_password("member123"),
                role="member",
                card_number="LIB-2024-1001",
                phone="+1 555-0101",
                is_active=True
            ),
            User(
                name="Bob Smith",
                email="bob@example.com",
                hashed_password=hash_password("member123"),
                role="member",
                card_number="LIB-2024-1002",
                phone="+1 555-0102",
                is_active=True
            ),
            User(
                name="Clara Oswald",
                email="clara@example.com",
                hashed_password=hash_password("member123"),
                role="member",
                card_number="LIB-2024-1003",
                phone="+1 555-0103",
                is_active=True
            ),
            User(
                name="David Miller",
                email="david@example.com",
                hashed_password=hash_password("member123"),
                role="member",
                card_number="LIB-2024-1004",
                phone="+1 555-0104",
                is_active=True
            ),
            User(
                name="Emma Watson",
                email="emma@example.com",
                hashed_password=hash_password("member123"),
                role="member",
                card_number="LIB-2024-1005",
                phone="+1 555-0105",
                is_active=True
            )
        ]
        db.add_all(members)
        db.flush()

        # 3. Create Books
        books = [
            Book(
                isbn="978-0132350884",
                title="Clean Code: A Handbook of Agile Software Craftsmanship",
                author="Robert C. Martin",
                category="Computer Science",
                publication_year=2008,
                total_copies=4,
                available_copies=3,
                shelf_location="Rack CS-1",
                description="Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
                cover_url="https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=400&q=80"
            ),
            Book(
                isbn="978-0201633610",
                title="Design Patterns: Elements of Reusable Object-Oriented Software",
                author="Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
                category="Computer Science",
                publication_year=1994,
                total_copies=3,
                available_copies=2,
                shelf_location="Rack CS-1",
                description="Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple and succinct solutions.",
                cover_url="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80"
            ),
            Book(
                isbn="978-0134685991",
                title="Effective Java (3rd Edition)",
                author="Joshua Bloch",
                category="Computer Science",
                publication_year=2018,
                total_copies=3,
                available_copies=3,
                shelf_location="Rack CS-2",
                description="The definitive guide to best-practices Java programming platform techniques and idioms.",
                cover_url="https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80"
            ),
            Book(
                isbn="978-0451524935",
                title="1984",
                author="George Orwell",
                category="Fiction & Dystopian",
                publication_year=1949,
                total_copies=5,
                available_copies=4,
                shelf_location="Rack LIT-4",
                description="A startling and haunting vision of the world, 1984 is so powerfully terrifying that its impression remains unforgettable.",
                cover_url="https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80"
            ),
            Book(
                isbn="978-0061120084",
                title="To Kill a Mockingbird",
                author="Harper Lee",
                category="Classic Literature",
                publication_year=1960,
                total_copies=4,
                available_copies=4,
                shelf_location="Rack LIT-2",
                description="Compassionate, dramatic, and deeply moving, taking readers to the roots of human behavior.",
                cover_url="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80"
            ),
            Book(
                isbn="978-0743273565",
                title="The Great Gatsby",
                author="F. Scott Fitzgerald",
                category="Classic Literature",
                publication_year=1925,
                total_copies=3,
                available_copies=2,
                shelf_location="Rack LIT-2",
                description="The story of the fabulously wealthy Jay Gatsby and his new love for the beautiful Daisy Buchanan.",
                cover_url="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80"
            ),
            Book(
                isbn="978-0385504201",
                title="A Brief History of Time",
                author="Stephen Hawking",
                category="Science & Astronomy",
                publication_year=1988,
                total_copies=4,
                available_copies=3,
                shelf_location="Rack SCI-1",
                description="Was there a beginning of time? Could time run backwards? Is the universe boundless or can it come to an end?",
                cover_url="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80"
            ),
            Book(
                isbn="978-0062316097",
                title="Sapiens: A Brief History of Humankind",
                author="Yuval Noah Harari",
                category="History & Anthropology",
                publication_year=2014,
                total_copies=5,
                available_copies=4,
                shelf_location="Rack HIST-3",
                description="From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution.",
                cover_url="https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&q=80"
            ),
            Book(
                isbn="978-0804139298",
                title="Zero to One: Notes on Startups",
                author="Peter Thiel, Blake Masters",
                category="Business & Economics",
                publication_year=2014,
                total_copies=3,
                available_copies=3,
                shelf_location="Rack BIZ-1",
                description="The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create.",
                cover_url="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80"
            ),
            Book(
                isbn="978-0345391803",
                title="The Hitchhiker's Guide to the Galaxy",
                author="Douglas Adams",
                category="Science Fiction",
                publication_year=1979,
                total_copies=4,
                available_copies=4,
                shelf_location="Rack SCI-FI-2",
                description="Seconds before Earth is demolished for a galactic freeway, Arthur Dent is saved by his friend Ford Prefect.",
                cover_url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80"
            ),
            Book(
                isbn="978-0143127741",
                title="Meditations",
                author="Marcus Aurelius",
                category="Philosophy",
                publication_year=2006,
                total_copies=4,
                available_copies=3,
                shelf_location="Rack PHIL-1",
                description="Personal writings of the Roman Emperor Marcus Aurelius setting forth his ideas on Stoic philosophy.",
                cover_url="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&q=80"
            ),
            Book(
                isbn="978-0593157824",
                title="Atomic Habits",
                author="James Clear",
                category="Self-Improvement",
                publication_year=2018,
                total_copies=6,
                available_copies=5,
                shelf_location="Rack SELF-1",
                description="An easy and proven way to build good habits and break bad ones through tiny changes with remarkable results.",
                cover_url="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80"
            )
        ]
        db.add_all(books)
        db.flush()

        # 4. Pre-populate Circulation Records
        now = utc_now()
        # Normal active borrow (Alice borrowed Clean Code)
        b1 = BorrowRecord(
            user_id=members[0].id,
            book_id=books[0].id,
            borrow_date=now - timedelta(days=5),
            due_date=now + timedelta(days=9),
            renewal_count=0,
            status="borrowed",
            notes="Standard course reading"
        )

        # Overdue borrow (Bob borrowed Design Patterns - 4 days overdue)
        b2 = BorrowRecord(
            user_id=members[1].id,
            book_id=books[1].id,
            borrow_date=now - timedelta(days=18),
            due_date=now - timedelta(days=4),
            renewal_count=0,
            status="overdue",
            notes="Student contacted regarding overdue return"
        )

        # Returned borrow on time (Clara returned 1984)
        b3 = BorrowRecord(
            user_id=members[2].id,
            book_id=books[3].id,
            borrow_date=now - timedelta(days=20),
            due_date=now - timedelta(days=6),
            return_date=now - timedelta(days=8),
            renewal_count=1,
            status="returned",
            notes="Returned in excellent condition"
        )

        # Overdue borrow (David borrowed Great Gatsby - 10 days overdue)
        b4 = BorrowRecord(
            user_id=members[3].id,
            book_id=books[5].id,
            borrow_date=now - timedelta(days=24),
            due_date=now - timedelta(days=10),
            renewal_count=0,
            status="overdue",
            notes="Second reminder email sent"
        )

        # Active borrow (Emma borrowed Atomic Habits)
        b5 = BorrowRecord(
            user_id=members[4].id,
            book_id=books[11].id,
            borrow_date=now - timedelta(days=2),
            due_date=now + timedelta(days=12),
            renewal_count=0,
            status="borrowed",
            notes="Self-study"
        )

        # Returned borrow with settled fine (Alice returned Brief History of Time 3 days late)
        b6 = BorrowRecord(
            user_id=members[0].id,
            book_id=books[6].id,
            borrow_date=now - timedelta(days=25),
            due_date=now - timedelta(days=11),
            return_date=now - timedelta(days=8),
            renewal_count=0,
            status="returned",
            notes="Late return, fine paid at front desk"
        )

        db.add_all([b1, b2, b3, b4, b5, b6])
        db.flush()

        # Add fine records for b6 (settled) and b2, b4 (pending fines)
        fine_b6 = FineRecord(
            borrow_id=b6.id,
            amount=1.50,
            status="paid",
            created_at=now - timedelta(days=8),
            paid_at=now - timedelta(days=8)
        )
        fine_b2 = FineRecord(
            borrow_id=b2.id,
            amount=2.00,
            status="pending",
            created_at=now - timedelta(days=4)
        )
        fine_b4 = FineRecord(
            borrow_id=b4.id,
            amount=5.00,
            status="pending",
            created_at=now - timedelta(days=10)
        )
        db.add_all([fine_b6, fine_b2, fine_b4])

        db.commit()
        print("Database successfully seeded with realistic library catalog, members, and loans!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
