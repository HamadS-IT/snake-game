def test_register_creates_user_and_hashes_password(client):
    resp = client.post(
        "/auth/register",
        json={"email": "a@example.com", "username": "alice", "password": "secretpw"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "a@example.com"
    assert body["username"] == "alice"
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_rejects_duplicate_email_or_username(client):
    client.post(
        "/auth/register",
        json={"email": "a@example.com", "username": "alice", "password": "secretpw"},
    )
    resp = client.post(
        "/auth/register",
        json={"email": "a@example.com", "username": "someoneelse", "password": "secretpw"},
    )
    assert resp.status_code == 409

    resp2 = client.post(
        "/auth/register",
        json={"email": "other@example.com", "username": "alice", "password": "secretpw"},
    )
    assert resp2.status_code == 409


def test_login_success_returns_token(client):
    client.post(
        "/auth/register",
        json={"email": "a@example.com", "username": "alice", "password": "secretpw"},
    )
    resp = client.post("/auth/login", data={"username": "alice", "password": "secretpw"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client):
    client.post(
        "/auth/register",
        json={"email": "a@example.com", "username": "alice", "password": "secretpw"},
    )
    resp = client.post("/auth/login", data={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user_returns_401(client):
    resp = client.post("/auth/login", data={"username": "ghost", "password": "whatever"})
    assert resp.status_code == 401
