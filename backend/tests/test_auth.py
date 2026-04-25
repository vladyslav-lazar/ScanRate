from unittest.mock import patch
from conftest import auth_header


def test_login_creates_user_if_not_exists(client):
    with patch("main.send_magic_link") as mock_send:
        res = client.post("/auth/login", json={"email": "new@test.com"})
    assert res.status_code == 200
    mock_send.assert_called_once()


def test_login_existing_user(client, regular_user):
    with patch("main.send_magic_link") as mock_send:
        res = client.post("/auth/login", json={"email": regular_user.email})
    assert res.status_code == 200
    mock_send.assert_called_once()


def test_login_invalid_email(client):
    res = client.post("/auth/login", json={"email": "not-an-email"})
    assert res.status_code == 422


def test_verify_invalid_token(client):
    res = client.get("/auth/verify?token=invalidtoken")
    assert res.status_code == 400


def test_verify_valid_token(client, db, regular_user):
    from datetime import datetime, UTC
    from models import AuthToken
    from auth import create_magic_token

    token = create_magic_token()
    auth_token = AuthToken(
        user_id=regular_user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(auth_token)
    db.commit()

    res = client.get(f"/auth/verify?token={token}")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["is_admin"] is False


def test_verify_used_token(client, db, regular_user):
    from datetime import datetime, timedelta, UTC
    from models import AuthToken
    from auth import create_magic_token

    token = create_magic_token()
    auth_token = AuthToken(
        user_id=regular_user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
        used=True,
    )
    db.add(auth_token)
    db.commit()

    res = client.get(f"/auth/verify?token={token}")
    assert res.status_code == 400


def test_verify_expired_token(client, db, regular_user):
    from datetime import datetime, timedelta, UTC
    from models import AuthToken
    from auth import create_magic_token

    token = create_magic_token()
    auth_token = AuthToken(
        user_id=regular_user.id,
        token=token,
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    db.add(auth_token)
    db.commit()

    res = client.get(f"/auth/verify?token={token}")
    assert res.status_code == 400


def test_get_me_authenticated(client, user_token):
    res = client.get("/auth/me", headers=auth_header(user_token))
    assert res.status_code == 200
    assert res.json()["email"] == "user@test.com"


def test_get_me_unauthenticated(client):
    res = client.get("/auth/me")
    assert res.status_code == 401
