def test_list_books(client):
    response = client.get("/api/books")
    assert response.status_code == 200
    data = response.json()
    assert "books" in data
    assert "total" in data

def test_create_book_as_admin(client, admin_headers):
    payload = {
        "isbn": "978-0321125217",
        "title": "Domain-Driven Design",
        "author": "Eric Evans",
        "category": "Computer Science",
        "publication_year": 2003,
        "total_copies": 3,
        "shelf_location": "CS-3",
        "description": "Tackling complexity in the heart of software."
    }
    response = client.post("/api/books", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Domain-Driven Design"
    assert data["available_copies"] == 3

def test_create_book_forbidden_for_member(client, member_headers):
    payload = {
        "isbn": "978-0000000001",
        "title": "Unauthorized Title",
        "author": "Anon",
        "category": "Fiction",
        "total_copies": 1
    }
    response = client.post("/api/books", json=payload, headers=member_headers)
    assert response.status_code == 403

def test_search_and_filter_books(client, admin_headers):
    client.post("/api/books", json={
        "isbn": "978-1111111111",
        "title": "Python Deep Dive",
        "author": "Guido van Rossum",
        "category": "Programming",
        "total_copies": 2
    }, headers=admin_headers)

    # Search query
    res = client.get("/api/books?q=Deep+Dive")
    assert res.status_code == 200
    assert any(b["title"] == "Python Deep Dive" for b in res.json()["books"])

    # Filter by category
    res_cat = client.get("/api/books?category=Programming")
    assert res_cat.status_code == 200
    assert all(b["category"] == "Programming" for b in res_cat.json()["books"])
