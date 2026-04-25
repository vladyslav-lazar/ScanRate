from auth import create_jwt, decode_jwt, create_magic_token
from jose import JWTError
import pytest


def test_create_and_decode_jwt():
    token = create_jwt(user_id=1, is_admin=False)
    payload = decode_jwt(token)
    assert payload["sub"] == "1"
    assert payload["is_admin"] is False


def test_create_admin_jwt():
    token = create_jwt(user_id=42, is_admin=True)
    payload = decode_jwt(token)
    assert payload["sub"] == "42"
    assert payload["is_admin"] is True


def test_decode_invalid_jwt():
    with pytest.raises(JWTError):
        decode_jwt("this.is.invalid")


def test_decode_tampered_jwt():
    token = create_jwt(user_id=1, is_admin=False)
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_jwt(tampered)


def test_magic_token_is_unique():
    tokens = {create_magic_token() for _ in range(100)}
    assert len(tokens) == 100


def test_magic_token_length():
    token = create_magic_token()
    # token_urlsafe(32) produces ~43 chars
    assert len(token) >= 40
