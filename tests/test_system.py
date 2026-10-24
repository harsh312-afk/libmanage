def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_favicon_ico(client):
    response = client.get("/favicon.ico")
    assert response.status_code == 200

def test_favicon_svg(client):
    response = client.get("/favicon.svg")
    assert response.status_code == 200
    assert "image/svg+xml" in response.headers["content-type"]

def test_serve_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Libraria" in response.text
    assert "favicon.svg" in response.text

def test_main_app_import():
    from main import app as fastapi_app
    assert fastapi_app is not None
