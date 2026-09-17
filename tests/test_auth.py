def test_register_new_user(client):
    payload = {
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.org",
        "password": "strongpassword123",
        "phone": "+1 555-4321"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah@cyberdyne.org"
    assert data["user"]["card_number"].startswith("LIB-")

def test_login_success(client, test_member):
    response = client.post("/api/auth/login", json={
        "email": test_member.email,
        "password": "memberpass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == test_member.id

def test_login_invalid_password(client, test_member):
    response = client.post("/api/auth/login", json={
        "email": test_member.email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_me(client, member_headers, test_member):
    response = client.get("/api/auth/me", headers=member_headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_member.email
