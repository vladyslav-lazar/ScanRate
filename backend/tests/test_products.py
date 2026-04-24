from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_unknown_product_creates_it():
    res = client.get("/product/5000112637922")
    assert res.status_code == 200
    data = res.json()
    assert data["ean"] == "5000112637922"

def test_rate_nonexistent_product_returns_404():
    res = client.post("/product/0000000000000/rate", json={"score": 5})
    assert res.status_code == 404

def test_rate_score_out_of_range():
    res = client.post("/product/5000112637922/rate", json={"score": 6})
    assert res.status_code == 422  # Pydantic validation error