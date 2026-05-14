from conftest import auth_header


# -------------------------
# Admin — reviews
# -------------------------

def test_get_pending_reviews(client, admin_token, product, approved_rating, db):
    from models import Rating
    # Change rating to pending for this test
    db.query(Rating).filter(Rating.id == approved_rating.id).update({"status": "pending"})
    db.commit()

    res = client.get("/admin/reviews?status=pending", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_get_reviews_requires_admin(client, user_token):
    res = client.get("/admin/reviews", headers=auth_header(user_token))
    assert res.status_code == 403


def test_get_reviews_requires_auth(client):
    res = client.get("/admin/reviews")
    assert res.status_code == 401


def test_approve_review(client, admin_token, approved_rating, db):
    from models import Rating
    db.query(Rating).filter(Rating.id == approved_rating.id).update({"status": "pending"})
    db.commit()

    res = client.post(
        f"/admin/reviews/{approved_rating.id}/approve",
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200

    db.expire_all()
    rating = db.query(Rating).filter(Rating.id == approved_rating.id).first()
    assert rating.status == "approved"


def test_reject_review(client, admin_token, approved_rating, db):
    from models import Rating
    res = client.post(
        f"/admin/reviews/{approved_rating.id}/reject",
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200

    db.expire_all()
    rating = db.query(Rating).filter(Rating.id == approved_rating.id).first()
    assert rating.status == "rejected"


def test_approve_nonexistent_review(client, admin_token):
    res = client.post("/admin/reviews/99999/approve", headers=auth_header(admin_token))
    assert res.status_code == 404


# -------------------------
# Admin — product requests
# -------------------------

def test_get_pending_requests(client, admin_token, db):
    from models import Product
    req = Product(ean="4820024790099", name="Тест", status="pending")
    db.add(req)
    db.commit()

    res = client.get("/admin/requests?status=pending", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_approve_request(client, admin_token, db):
    from models import Product
    req = Product(ean="4820024790099", name="Новий продукт", brand="Бренд", status="pending")
    db.add(req)
    db.commit()

    res = client.post(
        f"/admin/requests/{req.id}/approve",
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200

    product = db.query(Product).filter(Product.ean == "4820024790099", Product.status == "approved").first()
    assert product is not None
    assert product.name == "Новий продукт"


def test_approve_request_already_exists(client, admin_token, db, product):
    from models import Product
    req = Product(ean=product.ean, name=product.name, status="pending")
    db.add(req)
    db.commit()

    res = client.post(
        f"/admin/requests/{req.id}/approve",
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200
    assert res.json().get("note") is not None


def test_reject_request(client, admin_token, db):
    from models import Product
    req = Product(ean="4820024790099", name="Тест", status="pending")
    db.add(req)
    db.commit()

    res = client.post(
        f"/admin/requests/{req.id}/reject",
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200

    db.expire_all()
    assert db.query(Product).filter(Product.id == req.id).first().status == "rejected"


# -------------------------
# Admin — add product
# -------------------------

def test_admin_add_product(client, admin_token):
    res = client.post(
        "/admin/products",
        json={"ean": "4820024790099", "name": "Тест", "brand": "Бренд"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200
    assert res.json()["ean"] == "4820024790099"


def test_admin_add_product_duplicate(client, admin_token, product):
    res = client.post(
        "/admin/products",
        json={"ean": product.ean, "name": "Дублікат"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 409


def test_admin_add_product_invalid_ean(client, admin_token):
    res = client.post(
        "/admin/products",
        json={"ean": "123", "name": "Тест"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 422


def test_admin_add_product_requires_admin(client, user_token):
    res = client.post(
        "/admin/products",
        json={"ean": "4820024790099", "name": "Тест"},
        headers=auth_header(user_token),
    )
    assert res.status_code == 403


# -------------------------
# Admin — edit product
# -------------------------

def test_admin_edit_product(client, admin_token, product, db):
    from models import Product
    res = client.put(
        f"/admin/products/{product.ean}",
        json={"name": "Нова назва", "brand": "Новий бренд"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 200

    db.expire_all()
    updated = db.query(Product).filter(Product.ean == product.ean).first()
    assert updated.name == "Нова назва"


def test_admin_edit_nonexistent_product(client, admin_token):
    res = client.put(
        "/admin/products/9999999999999",
        json={"name": "Тест"},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 404


# -------------------------
# Admin — stats
# -------------------------

def test_get_stats(client, admin_token, product, approved_rating):
    res = client.get("/admin/stats", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 1
    assert data["total_reviews"] == 1
    assert data["reviews_approved"] == 1
    assert data["reviews_pending"] == 0


def test_get_stats_requires_admin(client, user_token):
    res = client.get("/admin/stats", headers=auth_header(user_token))
    assert res.status_code == 403
