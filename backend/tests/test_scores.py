def register_and_login(client, username):
    client.post(
        "/auth/register",
        json={"email": f"{username}@example.com", "username": username, "password": "pw12345"},
    )
    token = client.post(
        "/auth/login", data={"username": username, "password": "pw12345"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_submit_score_requires_auth(client):
    resp = client.post("/scores", json={"points": 100, "level_reached": 2})
    assert resp.status_code == 401


def test_submit_score_creates_row_for_current_user(client, auth_headers):
    resp = client.post(
        "/scores", json={"points": 120, "level_reached": 3}, headers=auth_headers
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["points"] == 120
    assert body["level_reached"] == 3


def test_leaderboard_shows_one_entry_per_user_with_their_best_score(client):
    alice_headers = register_and_login(client, "alice")
    for points in [50, 200, 75]:
        client.post("/scores", json={"points": points, "level_reached": 1}, headers=alice_headers)

    bob_headers = register_and_login(client, "bob")
    client.post("/scores", json={"points": 120, "level_reached": 2}, headers=bob_headers)

    resp = client.get("/scores/leaderboard", headers=alice_headers)
    assert resp.status_code == 200
    body = resp.json()

    assert len(body) == 2
    by_username = {row["username"]: row["points"] for row in body}
    assert by_username == {"alice": 200, "bob": 120}
    assert [row["points"] for row in body] == sorted(by_username.values(), reverse=True)


def test_leaderboard_respects_limit_param(client):
    for i in range(5):
        headers = register_and_login(client, f"player{i}")
        client.post("/scores", json={"points": i * 10, "level_reached": 1}, headers=headers)

    resp = client.get("/scores/leaderboard?limit=2", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    assert [row["points"] for row in body] == [40, 30]


def test_my_scores_returns_only_current_users_history_and_correct_best(client):
    alice_headers = register_and_login(client, "alice")
    bob_headers = register_and_login(client, "bob")

    client.post("/scores", json={"points": 10, "level_reached": 1}, headers=alice_headers)
    client.post("/scores", json={"points": 90, "level_reached": 2}, headers=alice_headers)
    client.post("/scores", json={"points": 500, "level_reached": 5}, headers=bob_headers)

    resp = client.get("/scores/me", headers=alice_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["best"] == 90
    assert body["total"] == 2
    assert len(body["history"]) == 2


def test_my_scores_pagination_limits_and_offsets_correctly(client, auth_headers):
    for points in range(15):
        client.post("/scores", json={"points": points, "level_reached": 1}, headers=auth_headers)

    first_page = client.get("/scores/me?limit=10&offset=0", headers=auth_headers).json()
    assert first_page["total"] == 15
    assert len(first_page["history"]) == 10
    assert first_page["best"] == 14

    second_page = client.get("/scores/me?limit=10&offset=10", headers=auth_headers).json()
    assert second_page["total"] == 15
    assert len(second_page["history"]) == 5

    first_ids = {s["id"] for s in first_page["history"]}
    second_ids = {s["id"] for s in second_page["history"]}
    assert first_ids.isdisjoint(second_ids)
