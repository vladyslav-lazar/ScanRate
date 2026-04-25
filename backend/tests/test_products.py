from unittest.mock import patch, AsyncMock
from conftest import auth_header


MOCK_OFF_RESPONSE = {
    "status": 1,
    "product": {
        "product_name": "Молоко 2.5%",
        "brands": "Галичина",
        "image_front_url": "https://example.com/image.jpg",
        "ingredients_text": "Молоко пастеризоване",
    }
}

MOCK_OFF_EMPTY = {"status": 0}


# -------------------------
# GET /product/{ean}
# -------------------------

def test_get_product_not_in_db(client):
    res = client.get("/product/4820024790022")
    assert res.status_code == 404


def test_get_product_exists(client, product):
    res = client.get(f"/product/{product.ean}")
    assert res.status_code == 200
    data = res.json()
    assert data["ean"] == product.ean
    assert data["name"] == product.name


def test_get_product_shows_only_approved_ratings(client, product, approved_rating, db, regular_user):
    from models import Rating
    # Add a pending rating from a different user
    from models import User
    other = User(email="other@test.com", is_admin=False)
    db.add(other)
    db.commit()
    db.refresh(other)
    pending = Rating(product_id=product.id, user_id=other.id, score=1, status="pending")
    db.add(pending)
    db.commit()

    res = client.get(f"/product/{product.ean}")
    assert res.status_code == 200
    data = res.json()
    assert data["total_ratings"] == 1
    assert len(data["ratings"]) == 1
    assert data["ratings"][0]["score"] == 4


# -------------------------
# GET /product/{ean}/lookup
# -------------------------

def test_lookup_product_in_local_db(client, product):
    res = client.get(f"/product/{product.ean}/lookup")
    assert res.status_code == 200
    assert res.json()["in_local_db"] is True


def test_lookup_product_found_on_off(client):
    with patch("main.fetch_product_info", new=AsyncMock(return_value={
        "name": "Молоко 2.5%", "brand": "Галичина",
        "image_url": None, "description": None,
    })):
        res = client.get("/product/4820024790099/lookup")
    assert res.status_code == 200
    data = res.json()
    assert data["in_local_db"] is False
    assert data["name"] == "Молоко 2.5%"


def test_lookup_product_not_found_anywhere(client):
    with patch("main.fetch_product_info", new=AsyncMock(return_value={
        "name": None, "brand": None, "image_url": None, "description": None,
    })):
        res = client.get("/product/0000000000000/lookup")
    assert res.status_code == 200
    data = res.json()
    assert data["in_local_db"] is False
    assert data["name"] is None


# -------------------------
# GET /product/search/{ean}
# -------------------------

def test_search_product_found(client, product):
    res = client.get(f"/product/search/{product.ean}")
    assert res.status_code == 200
    assert res.json()["ean"] == product.ean


def test_search_product_not_found(client):
    res = client.get("/product/search/9999999999999")
    assert res.status_code == 404


# -------------------------
# POST /product/{ean}/rate
# -------------------------

def test_rate_product_success(client, product, user_token):
    res = client.post(
        f"/product/{product.ean}/rate",
        json={"score": 5, "comment": "Відмінно!"},
        headers=auth_header(user_token),
    )
    assert res.status_code == 200


def test_rate_product_unauthenticated(client, product):
    res = client.post(f"/product/{product.ean}/rate", json={"score": 4})
    assert res.status_code == 401


def test_rate_product_duplicate(client, product, user_token, approved_rating):
    res = client.post(
        f"/product/{product.ean}/rate",
        json={"score": 3},
        headers=auth_header(user_token),
    )
    assert res.status_code == 409


def test_rate_product_invalid_score(client, product, user_token):
    res = client.post(
        f"/product/{product.ean}/rate",
        json={"score": 6},
        headers=auth_header(user_token),
    )
    assert res.status_code == 422


def test_rate_product_not_in_db(client, user_token):
    res = client.post(
        "/product/9999999999999/rate",
        json={"score": 3},
        headers=auth_header(user_token),
    )
    assert res.status_code == 404


def test_rate_product_goes_to_pending(client, product, user_token, db):
    from models import Rating
    client.post(
        f"/product/{product.ean}/rate",
        json={"score": 5},
        headers=auth_header(user_token),
    )
    rating = db.query(Rating).filter(Rating.product_id == product.id).first()
    assert rating.status == "pending"


# -------------------------
# PUT /product/{ean}/rate
# -------------------------

def test_edit_rating_success(client, product, user_token, approved_rating):
    res = client.put(
        f"/product/{product.ean}/rate",
        json={"score": 2, "comment": "Передумав"},
        headers=auth_header(user_token),
    )
    assert res.status_code == 200


def test_edit_rating_resets_to_pending(client, product, user_token, approved_rating, db):
    from models import Rating
    client.put(
        f"/product/{product.ean}/rate",
        json={"score": 2},
        headers=auth_header(user_token),
    )
    db.expire_all()
    rating = db.query(Rating).filter(Rating.id == approved_rating.id).first()
    assert rating.status == "pending"
    assert rating.score == 2


def test_edit_rating_not_found(client, product, user_token):
    res = client.put(
        f"/product/{product.ean}/rate",
        json={"score": 3},
        headers=auth_header(user_token),
    )
    assert res.status_code == 404


def test_edit_rating_unauthenticated(client, product):
    res = client.put(f"/product/{product.ean}/rate", json={"score": 3})
    assert res.status_code == 401


# -------------------------
# GET /product/{ean}/my-review
# -------------------------

def test_get_my_review_exists(client, product, user_token, approved_rating):
    res = client.get(
        f"/product/{product.ean}/my-review",
        headers=auth_header(user_token),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 4
    assert data["status"] == "approved"


def test_get_my_review_not_exists(client, product, user_token):
    res = client.get(
        f"/product/{product.ean}/my-review",
        headers=auth_header(user_token),
    )
    assert res.status_code == 200
    assert res.json() is None


def test_get_my_review_unauthenticated(client, product):
    res = client.get(f"/product/{product.ean}/my-review")
    assert res.status_code == 401


# -------------------------
# GET /products/recent and /products/top
# -------------------------

def test_get_recent_products(client, product):
    res = client.get("/products/recent")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_get_top_products_empty(client, product):
    res = client.get("/products/top")
    assert res.status_code == 200
    assert res.json() == []  # no approved ratings yet


def test_get_top_products_with_ratings(client, product, approved_rating):
    res = client.get("/products/top")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["average_rating"] == 4.0


# -------------------------
# POST /product/{ean}/request
# -------------------------

def test_request_product_success(client, user_token):
    with patch("main.fetch_product_info", new=AsyncMock(return_value={
        "name": "Новий продукт", "brand": "Бренд",
        "image_url": None, "description": None,
    })):
        res = client.post(
            "/product/4820024790099/request",
            headers=auth_header(user_token),
        )
    assert res.status_code == 200
    assert res.json()["status"] == "pending"


def test_request_product_duplicate_returns_existing(client, user_token):
    with patch("main.fetch_product_info", new=AsyncMock(return_value={
        "name": "Новий продукт", "brand": None,
        "image_url": None, "description": None,
    })):
        res1 = client.post("/product/4820024790099/request", headers=auth_header(user_token))
        res2 = client.post("/product/4820024790099/request", headers=auth_header(user_token))
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["id"] == res2.json()["id"]


def test_request_product_unauthenticated(client):
    res = client.post("/product/4820024790099/request")
    assert res.status_code == 401
