from app.core.security import create_access_token

def test_export_books_csv_with_header(client, admin_headers):
    response = client.get(
        "/api/export/books",
        headers=admin_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment; filename=books_catalog_" in response.headers["content-disposition"]

def test_export_books_csv_with_query_param(client, test_admin):
    token = create_access_token(data={"sub": str(test_admin.id), "email": test_admin.email, "role": test_admin.role})
    response = client.get(f"/api/export/books?token={token}")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment; filename=books_catalog_" in response.headers["content-disposition"]

def test_export_unauthorized(client):
    response = client.get("/api/export/books")
    assert response.status_code == 401
