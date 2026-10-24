<div align="center">

# 📚 Libraria — Full Stack Library Management System

[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://libmanage-blue.vercel.app)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tests Passing](https://img.shields.io/badge/pytest-18%20passed-success?style=for-the-badge&logo=pytest)](https://docs.pytest.org/)

**A modern, production-grade library management application with real-time circulation tracking, automated overdue fine calculation, inventory controls, interactive analytics, and responsive UI.**

🌐 **Live Vercel URL**: **[https://libmanage-blue.vercel.app](https://libmanage-blue.vercel.app)**  
📖 **Interactive Swagger API Docs**: **[https://libmanage-blue.vercel.app/docs](https://libmanage-blue.vercel.app/docs)**

[Live Demo](#-live-hosted-deployment) • [Key Features](#-key-features) • [Architecture](#-architecture) • [Quickstart](#-quickstart) • [Default Accounts](#-default-accounts) • [API Reference](#-api-reference) • [Testing](#-running-tests)

</div>

---

## 🌐 Live Hosted Deployment

The application is deployed and hosted on **Vercel** with full zero-config serverless FastAPI integration and automated SQLite database initialization:

- **Production Web Application**: [https://libmanage-blue.vercel.app](https://libmanage-blue.vercel.app)
- **Interactive OpenAPI / Swagger**: [https://libmanage-blue.vercel.app/docs](https://libmanage-blue.vercel.app/docs)
- **Health Check Endpoint**: [https://libmanage-blue.vercel.app/health](https://libmanage-blue.vercel.app/health)

> [!TIP]
> Use the **⚡ Demo** switcher in the top navigation bar of the live hosted application to instantly switch between **Admin (Chief Librarian)** and **Patron (Student)** modes with one click.

---

## 🌟 Key Features & Improvements

- **🎨 Custom App Icons & Vector Branding**:
  - Custom high-resolution vector SVG icon (`favicon.svg`, `icon.svg`) featuring a digital library book with gradient layers and ribbon bookmark.
  - Multi-resolution raster icons (`favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `icon-512.png`).
  - Native browser favicon support and PWA-ready meta tags.
- **📊 Comprehensive Real-Time Dashboard**:
  - Live KPI cards: Total Titles, Inventory Copies, Active Loans, Registered Patrons, Overdue Loans, and Fines Collected.
  - Interactive click-throughs: clicking on KPI cards instantly navigates to filtered catalog or circulation views.
  - Prominent overdue loans warning alert banner with direct resolution action.
  - Quick action shortcuts bar right on the dashboard.
- **📖 Enhanced Book Catalog & Inventory Management**:
  - Real-time search across Title, Author, ISBN, and Description with debounced input.
  - **Genre filter chips** for one-click category filtering (`All`, `Computer Science`, `Classic Literature`, etc.).
  - **Multi-criteria sorting**: Title (A-Z / Z-A), Publication Year (Newest / Oldest), and Stock Count (High-Low).
  - Low stock warning badges (`⚠️ Only 1 Left`) for items nearing depletion.
  - Keyboard shortcut: Press `/` or `Ctrl+K` from anywhere to jump directly to catalog search.
  - Full CRUD for Librarians (Add, Edit, Delete with active loan protection).
- **🔄 Circulation Desk & Loan Automation**:
  - Live search filter inside the Circulation Desk by book title, author, patron name, or loan number.
  - Issue books with custom loan durations (default 14 days) and patron limit enforcement (up to 5 books).
  - Check-in / Return workflow with automated overdue fine calculation ($0.50/day).
  - Settle overdue fine directly during book return with a single checkbox.
  - Loan renewal counter tracking remaining renewals (up to 2 renewals allowed).
  - Overdue status badges with relative day indicators (`Overdue (+3d)`, `Due in 2d`, `Active`).
- **👥 Patron / Member Management**:
  - Directory of registered members with active loan counts.
  - **Patron loan history modal**: view all active and past borrowings for any individual member.
  - One-click copy for library card numbers (`LIB-YYYY-XXXX`).
  - Role-Based Access Control (**RBAC**): `admin` (Chief Librarian) vs `member` (Patron).
- **📈 Reports & Analytics**:
  - Genre distribution progress charts and collection share percentages.
  - Secure CSV export for Catalog Inventory and Circulation Audit logs (supporting both Bearer tokens and direct downloads).
- **☁️ Cloud & Serverless Ready (Vercel)**:
  - Automatic detection of serverless environment with fallback SQLite storage in `/tmp/libraria_data`.
  - Cold-start database initialization and automatic demo catalog seeding.
  - Responsive mobile drawer navigation menu.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (Modern SPA)                           │
│  - Dashboard: KPI cards, alert banners, quick action bar               │
│  - Catalog: Genre chips, multi-column sort, search with / shortcut     │
│  - Circulation Desk: Filterable loan audit table, check-in & renew     │
│  - Patron Directory: Member profiles & individual loan history modal   │
│  - Reports & Analytics: Collection distribution & CSV exporters        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FastAPI Backend Engine                          │
│  - /api/auth       (JWT authentication, role verification)             │
│  - /api/books      (Catalog search, filtering, sorting, CRUD)          │
│  - /api/borrows    (Issue, Return with automated fines, Renewals)      │
│  - /api/members    (Patron management, loan records)                   │
│  - /api/analytics  (KPI metrics, collection distribution)              │
│  - /api/export     (CSV exports for inventory & circulation)           │
│  - /health         (System health status)                              │
│  - /favicon.ico    (App icon endpoints)                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                       SQLite Database Engine                           │
│  - users           (id, name, email, password_hash, role, card_number) │
│  - books           (id, title, author, isbn, genre, copies, rack)      │
│  - borrow_records  (id, user_id, book_id, dates, renewal_count, status)│
│  - fine_records    (id, borrow_id, amount, status, paid_at)            │
└────────────────────────────────────────────────────────────────────────┘
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
uv sync --extra dev
```

**Using standard `pip`:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pytest httpx
```

### 2. Start the Local Server

```bash
uv run python main.py
```
*Or with an active virtual environment:*
```bash
python main.py
```

The application will start at:
- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔐 Default Accounts

Test the application using the **⚡ Quick Demo** buttons in the header / sign-in dialog, or log in manually:

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
| `POST` | `/api/borrows/{id}/return` | Return a borrowed book & compute overdue fine | Bearer Token |
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

The test suite runs with an isolated in-memory SQLite database:

```bash
uv run --extra dev pytest -v
```

### Coverage (18 passing tests):
- **Authentication**: Registration, password verification, token generation, profile fetching, and invalid credentials.
- **Book Catalog**: Search queries, category filters, inventory copy tracking, and admin authorization.
- **Circulation Rules**: Issue workflow, stock decrement, prevention of duplicate active loans, return workflow, stock restock, loan renewals limit (max 2), and automated fine calculations.
- **CSV Data Export**: Export generation with Bearer authorization headers and query token verification.
- **System**: Health check, custom SVG/ICO favicon endpoints, and index shell serving.

---

## 📁 Repository Structure

```
├── app/
│   ├── api/                    # REST API route controllers
│   │   ├── auth.py             # User authentication & registration
│   │   ├── books.py            # Book catalog CRUD, search, filter
│   │   ├── borrows.py          # Circulation: issue, return, renew
│   │   ├── members.py          # Patron directory
│   │   ├── analytics.py        # Dashboard stats aggregation
│   │   └── export.py           # CSV data exporters (books & loans)
│   ├── core/                   # Application core modules
│   │   ├── config.py           # Settings, rules, and serverless path fallback
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
│   │   ├── favicon.svg         # Modern vector brand SVG icon
│   │   ├── favicon.ico         # Multi-size favicon
│   │   ├── apple-touch-icon.png# iOS touch icon
│   │   ├── css/style.css       # Clean design system & dark theme
│   │   ├── js/app.js           # Frontend controller and API client
│   │   └── index.html          # Semantic HTML5 application shell
│   ├── database.py             # SQLite engine with auto-initialization
│   └── seed.py                 # Realistic sample catalog seeder
├── tests/                      # Automated test suite (18 tests)
│   ├── conftest.py             # Pytest fixtures & in-memory SQLite DB
│   ├── test_auth.py            # Authentication tests
│   ├── test_books.py           # Catalog & search tests
│   ├── test_circulation.py     # Loan & fine calculation tests
│   ├── test_export.py          # CSV export authorization tests
│   └── test_system.py          # Favicon & system health tests
├── pyproject.toml              # Build system & dependency specifications
├── requirements.txt            # Production runtime dependencies
├── main.py                     # Application entrypoint & static mounting
├── .gitignore                  # Git ignore definitions
└── README.md                   # Project documentation & live links
```

---

## 📄 License

This project is licensed under the MIT License — feel free to use and adapt for academic, personal, or commercial purposes.
