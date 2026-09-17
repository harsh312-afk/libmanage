<div align="center">

# 📚 Libraria — Full Stack Library Management System

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tests Passing](https://img.shields.io/badge/pytest-10%20passed-success?style=for-the-badge&logo=pytest)](https://docs.pytest.org/)

**A modern, production-ready, full-stack library management application with real-time circulation tracking, automated overdue fine calculation, inventory management, and an accessible responsive dashboard.**

[Features](#-key-features) • [Architecture](#-architecture) • [Quickstart](#-quickstart) • [Default Accounts](#-default-accounts) • [API Reference](#-api-reference) • [Testing](#-running-tests)

</div>

---

## 🌟 Key Features

- **📊 Comprehensive Dashboard**: Real-time KPI summary (Total Titles, Inventory Copies, Currently Loaned, Registered Patrons, Overdue Loans, Fines Collected), dynamic activity feed, and category distribution progress bars.
- **📖 Book Catalog & Inventory Management**:
  - Full-text live search across Title, Author, ISBN, and Description with debouncing.
  - Genre category filters and stock availability filter (*"In Stock Only"*).
  - Rich modal previews with cover art, shelf rack location, synopsis, and stock status.
  - Full CRUD for Librarians (Add, Edit, Delete with safety checks for active loans).
- **🔄 Circulation Desk & Loan Automation**:
  - Issue books with configurable loan durations (default 14 days) and borrow limit enforcement (up to 5 titles per patron).
  - Return workflow with automated overdue fine calculation ($0.50/day).
  - One-click fine settlement option on return.
  - Loan renewal capabilities (up to 2 renewals before return is mandated).
  - Live atomic inventory decrement on issue and increment on return.
- **👥 Patron / Member Management**:
  - Automatic student/patron library card number generation (`LIB-YYYY-XXXX`).
  - Patron directory tracking active loans and account status.
  - Role-Based Access Control (**RBAC**): `admin` (Chief Librarian) vs `member` (Patron).
- **📈 Reports & Data Export**:
  - One-click CSV export of full book catalog inventory.
  - One-click CSV export of historical circulation logs and fine records.
- **🎨 Modern, Accessible Frontend**:
  - Built with modern semantic HTML5 and CSS Custom Properties.
  - Native `<dialog>` modal elements supporting light-dismiss outside-click behavior.
  - Smooth Light & Dark mode toggle with preference saved in `localStorage`.
  - Fast demo account switcher (1-click Admin or Patron login).
- **📑 Auto-Generated Swagger & OpenAPI Docs**: Live interactive API sandbox available at `/docs`.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Web UI)                        │
│  - Dashboard (KPI cards, activity feeds, metrics)           │
│  - Catalog (Search, filter by genre, add/edit/delete)       │
│  - Circulation Desk (Issue, Return with fine calc, Renew)   │
│  - Patron Directory (Member profiles, active loans count)   │
│  - Reports & Analytics (Genre distribution, CSV export)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Router                   │
│  - /api/auth       (Login, Register, Profile, Role RBAC)    │
│  - /api/books      (Catalog search, CRUD, inventory stock)  │
│  - /api/borrows    (Issue, Return, Renew, Overdue tracker)  │
│  - /api/members    (Patron management, loan history)        │
│  - /api/analytics  (KPI metrics, circulation statistics)   │
│  - /api/export     (CSV exports for catalog & loans)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0
┌──────────────────────────────▼──────────────────────────────┐
│                   SQLite Database Schema                    │
│  - users           (id, name, email, password_hash, role)   │
│  - books           (id, title, author, isbn, genre, copies) │
│  - borrow_records  (id, user_id, book_id, dates, status)    │
│  - fine_records    (id, borrow_id, amount, status, paid_at) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.10+** (or [uv](https://github.com/astral-sh/uv))

### 1. Installation

**Using `uv` (Recommended - fastest):**
```bash
# Clone the repository
git clone git@github.com:harsh312-afk/libmanage.git
cd libmanage

# Install dependencies into virtual environment
uv sync
```

**Using standard `pip`:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Server

```bash
uv run python main.py
```
*Or with an active virtual environment:*
```bash
python main.py
```

The server automatically initializes SQLite at `data/library.db` and pre-seeds realistic sample books, patrons, active loans, and overdue records on its first launch.

- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔐 Default Accounts

You can log in manually or use the **⚡ Quick Demo** buttons in the Sign In dialog:

| Role | Email | Password | Library Card Number | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Chief Librarian** | `admin@library.com` | `admin123` | `LIB-ADMIN-001` | Full administrative control (CRUD, members, all loans, exports) |
| **Patron / Student** | `alice@example.com` | `member123` | `LIB-2024-1001` | Browse catalog, borrow books, view personal loans |
| **Patron / Student** | `bob@example.com` | `member123` | `LIB-2024-1002` | Browse catalog, borrow books, view personal loans |

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new patron account | None |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT access token | None |
| `GET` | `/api/auth/me` | Fetch current authenticated user profile | Bearer Token |
| `PUT` | `/api/auth/profile` | Update profile information | Bearer Token |

### Book Catalog (`/api/books`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/books` | List books with search, genre, and stock filters | None |
| `GET` | `/api/books/categories` | Retrieve list of distinct book genres | None |
| `GET` | `/api/books/{id}` | Retrieve details of a specific book | None |
| `POST` | `/api/books` | Add a new book to the catalog | Admin |
| `PUT` | `/api/books/{id}` | Update book details and inventory copies | Admin |
| `DELETE` | `/api/books/{id}` | Remove book (blocked if active loans exist) | Admin |

### Circulation & Loans (`/api/borrows`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/borrows` | List loan records (filtered by status or user) | Bearer Token |
| `POST` | `/api/borrows` | Issue a book to a patron | Bearer Token |
| `POST` | `/api/borrows/{id}/return`| Return a borrowed book & compute overdue fine | Bearer Token |
| `POST` | `/api/borrows/{id}/renew` | Renew loan for an additional 14 days | Bearer Token |
| `POST` | `/api/borrows/{id}/pay-fine` | Settle outstanding overdue fine | Admin |

### Members & Patrons (`/api/members`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/members` | List registered patrons and active loan counts | Admin |
| `GET` | `/api/members/{id}` | Get patron profile and loan records | Bearer Token |
| `POST` | `/api/members` | Register a new member | Admin |
| `PUT` | `/api/members/{id}` | Update member profile or status | Admin |
| `DELETE` | `/api/members/{id}` | Delete member (blocked if books are loaned) | Admin |

### Reports & Analytics (`/api/analytics`, `/api/export`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | Aggregated KPI stats and recent activity | None |
| `GET` | `/api/export/books` | Download catalog inventory as CSV | Admin |
| `GET` | `/api/export/borrows` | Download circulation and fine audit as CSV | Admin |

---

## 🧪 Running Tests

A comprehensive test suite is included in `tests/` utilizing an in-memory SQLite database:

```bash
uv run pytest -v
```

### What is tested:
- **Authentication**: Registration, password verification, token generation, and invalid credential handling.
- **Book Management**: Catalog search queries, genre filtering, stock limits, and role authorization.
- **Circulation Rules**: Issue workflow, stock decrement, prevention of duplicate active loans for the same book, returns, stock restock, loan renewal limits, and automated overdue fine calculations.

---

## 📁 Repository Structure

```
├── app/
│   ├── api/                    # REST API route controllers
│   │   ├── auth.py             # User authentication & registration
│   │   ├── books.py            # Book catalog CRUD & search
│   │   ├── borrows.py          # Circulation: issue, return, renew
│   │   ├── members.py          # Patron management
│   │   ├── analytics.py        # Dashboard stats aggregation
│   │   └── export.py           # CSV data exporters
│   ├── core/                   # Application core modules
│   │   ├── config.py           # Settings and circulation rules
│   │   ├── security.py         # Passwords, JWT, and auth dependencies
│   │   └── utils.py            # Standard UTC datetime helper
│   ├── models/                 # SQLAlchemy 2.0 ORM models
│   │   ├── user.py             # User model
│   │   ├── book.py             # Book model
│   │   └── borrow.py           # BorrowRecord and FineRecord models
│   ├── schemas/                # Pydantic validation schemas
│   │   ├── user_schemas.py
│   │   ├── book_schemas.py
│   │   ├── borrow_schemas.py
│   │   └── analytics_schemas.py
│   ├── services/               # Core business logic services
│   │   ├── circulation_service.py # Circulation rules and fines
│   │   └── analytics_service.py   # KPI metrics calculations
│   ├── static/                 # Single-page frontend application
│   │   ├── css/style.css       # Clean design system & dark theme
│   │   ├── js/app.js           # Frontend controller and API client
│   │   └── index.html          # Semantic HTML5 application shell
│   ├── database.py             # SQLite engine and session factory
│   └── seed.py                 # Realistic sample catalog seeder
├── tests/                      # Automated test suite
│   ├── conftest.py             # Pytest fixtures & in-memory SQLite DB
│   ├── test_auth.py            # Authentication tests
│   ├── test_books.py           # Catalog & search tests
│   └── test_circulation.py     # Loan & fine calculation tests
├── pyproject.toml              # Build system & dependency specifications
├── requirements.txt            # Pinned requirements
├── main.py                     # Application entrypoint
├── .gitignore                  # Git ignore definitions
└── README.md                   # Project documentation
```

---

## 📄 License

This project is licensed under the MIT License — feel free to use and adapt for academic, personal, or commercial purposes.
