from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
import httpx
import os
import shutil
import uuid

from database import Base, engine, get_db
from models import Product, Rating, ProductRequest, User, AuthToken
from schemas import (
    RatingCreate,
    ProductOut,
    ProductSummary,
    ProductLookup,
    ProductRequestOut,
    RatingAdminOut,
    ManualProductCreate,
    ManualProductEdit,
    LoginRequest,
    TokenResponse,
    UserOut,
    StatsOut,
    TopProduct,
    ActiveUser,
    DailyActivity,
)
from auth import create_magic_token, create_jwt, decode_jwt
from email_service import send_magic_link

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = list({FRONTEND_URL, "http://localhost:5173"})

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI()

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)


# -------------------------
# Auth helpers
# -------------------------

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_jwt(token)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# -------------------------
# Product helpers
# -------------------------

async def fetch_product_info(ean: str) -> dict:
    url = f"https://world.openfoodfacts.org/api/v0/product/{ean}.json"
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, timeout=5)
            data = res.json()
            if data.get("status") == 1:
                p = data["product"]
                return {
                    "name":        p.get("product_name") or None,
                    "brand":       p.get("brands") or None,
                    "image_url":   p.get("image_front_url") or None,
                    "description": p.get("ingredients_text") or None,
                }
        except Exception:
            pass
    return {"name": None, "brand": None, "image_url": None, "description": None}


def _make_summary(product: Product, db: Session) -> ProductSummary:
    avg = db.query(func.avg(Rating.score))\
            .filter(Rating.product_id == product.id,
                    Rating.status == "approved")\
            .scalar()
    total = db.query(Rating)\
              .filter(Rating.product_id == product.id,
                      Rating.status == "approved")\
              .count()
    return ProductSummary(
        id=product.id,
        ean=product.ean,
        name=product.name,
        brand=product.brand,
        image_url=product.image_url,
        description=product.description,
        average_rating=round(avg, 2) if avg else None,
        total_ratings=total,
    )


# -------------------------
# Auth endpoints
# -------------------------

@app.post("/auth/login")
async def request_login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        user = User(email=body.email)
        db.add(user)
        db.commit()
        db.refresh(user)

    db.query(AuthToken)\
      .filter(AuthToken.user_id == user.id, not AuthToken.used)\
      .update({"used": True})
    db.commit()

    token = create_magic_token()
    auth_token = AuthToken(
        user_id    = user.id,
        token      = token,
        expires_at = datetime.utcnow() + timedelta(minutes=15),
    )
    db.add(auth_token)
    db.commit()

    send_magic_link(user.email, token)
    return {"message": "Посилання на вхід у Ваш аккаунт було надіслано на цю електронну скриньку."}


@app.get("/auth/verify", response_model=TokenResponse)
def verify_magic_link(token: str, db: Session = Depends(get_db)):
    auth_token = db.query(AuthToken).filter(AuthToken.token == token).first()

    if not auth_token:
        raise HTTPException(status_code=400, detail="Це посилання не є валідним.")
    if auth_token.used:
        raise HTTPException(status_code=400, detail="Це посилання вже було використано.")
    if auth_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Термін дії на це посилання закінчився.")

    auth_token.used = True
    db.commit()

    access_token = create_jwt(auth_token.user_id, auth_token.user.is_admin)
    return TokenResponse(access_token=access_token, is_admin=auth_token.user.is_admin)


@app.get("/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user

# -------------------------
# Product endpoints
# -------------------------

@app.get("/product/search/{ean}", response_model=ProductSummary)
def search_by_ean(ean: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не було знайдено.")
    return _make_summary(product, db)


@app.get("/product/{ean}/lookup", response_model=ProductLookup)
async def lookup_product(ean: str, db: Session = Depends(get_db)):
    in_local_db = db.query(Product).filter(Product.ean == ean).first() is not None
    if in_local_db:
        return ProductLookup(ean=ean, in_local_db=True, name=None, brand=None, image_url=None, description=None)
    info = await fetch_product_info(ean)
    return ProductLookup(ean=ean, in_local_db=False, **info)


@app.get("/product/{ean}", response_model=ProductOut)
async def get_product(ean: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не існує в базі даних сервісу.")

    avg = db.query(func.avg(Rating.score))\
            .filter(Rating.product_id == product.id, Rating.status == "approved").scalar()
    total = db.query(Rating)\
              .filter(Rating.product_id == product.id, Rating.status == "approved").count()
    approved_ratings = db.query(Rating)\
                         .filter(Rating.product_id == product.id, Rating.status == "approved").all()

    return ProductOut(
        id=product.id, ean=product.ean, name=product.name, brand=product.brand,
        image_url=product.image_url, description=product.description,
        average_rating=round(avg, 2) if avg else None,
        total_ratings=total, ratings=approved_ratings,
    )


@app.post("/product/{ean}/rate", response_model=ProductOut)
async def rate_product(
    ean:  str,
    body: RatingCreate,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не було знайдено. Будьте першими хто його відсканує!")

    existing = db.query(Rating)\
                 .filter(Rating.product_id == product.id, Rating.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ви вже оцінили цей продукт.")

    rating = Rating(product_id=product.id, user_id=user.id, score=body.score, comment=body.comment, status="pending")
    db.add(rating)
    db.commit()
    db.refresh(product)

    avg = db.query(func.avg(Rating.score))\
            .filter(Rating.product_id == product.id, Rating.status == "approved").scalar()
    total = db.query(Rating)\
              .filter(Rating.product_id == product.id, Rating.status == "approved").count()
    approved_ratings = db.query(Rating)\
                         .filter(Rating.product_id == product.id, Rating.status == "approved").all()

    return ProductOut(
        id=product.id, ean=product.ean, name=product.name, brand=product.brand,
        image_url=product.image_url, description=product.description,
        average_rating=round(avg, 2) if avg else None,
        total_ratings=total, ratings=approved_ratings,
    )


@app.post("/product/{ean}/request", response_model=ProductRequestOut)
async def request_product(
    ean:  str,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    existing = db.query(ProductRequest)\
                 .filter(ProductRequest.ean == ean, ProductRequest.status == "pending").first()
    if existing:
        return existing

    info = await fetch_product_info(ean)
    req = ProductRequest(ean=ean, **info)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


# -------------------------
# Product list endpoints
# -------------------------

@app.get("/products/recent", response_model=list[ProductSummary])
def get_recent_products(limit: int = 10, db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.id.desc()).limit(limit).all()
    return [_make_summary(p, db) for p in products]


@app.get("/products/top", response_model=list[ProductSummary])
def get_top_products(limit: int = 10, db: Session = Depends(get_db)):
    products = db.query(Product).all()
    summaries = [_make_summary(p, db) for p in products]
    rated = [s for s in summaries if s.average_rating is not None]
    return sorted(rated, key=lambda x: x.average_rating, reverse=True)[:limit]


# -------------------------
# Admin — reviews
# -------------------------

@app.get("/admin/reviews", response_model=list[RatingAdminOut])
def get_reviews(status: str = "pending", db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    return db.query(Rating).filter(Rating.status == status).order_by(Rating.created_at.desc()).all()


@app.post("/admin/reviews/{review_id}/approve")
def approve_review(review_id: int, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    r = db.query(Rating).filter(Rating.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Відгук не було знайдено.")
    r.status = "approved"
    db.commit()
    return {"status": "approved"}


@app.post("/admin/reviews/{review_id}/reject")
def reject_review(review_id: int, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    r = db.query(Rating).filter(Rating.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Відгук не було знайдено.")
    r.status = "rejected"
    db.commit()
    return {"status": "rejected"}


# -------------------------
# Admin — product requests
# -------------------------

@app.get("/admin/requests", response_model=list[ProductRequestOut])
def get_requests(status: str = "pending", db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    return db.query(ProductRequest)\
             .filter(ProductRequest.status == status)\
             .order_by(ProductRequest.created_at.desc()).all()


@app.post("/admin/requests/{request_id}/approve")
def approve_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    req = db.query(ProductRequest).filter(ProductRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не було знайдено.")

    existing = db.query(Product).filter(Product.ean == req.ean).first()
    if existing:
        req.status = "approved"
        db.commit()
        return {"status": "approved", "ean": req.ean, "note": "Продукт вже існує."}

    product = Product(ean=req.ean, name=req.name, brand=req.brand, image_url=req.image_url, description=req.description)
    db.add(product)
    req.status = "approved"
    db.commit()
    return {"status": "approved", "ean": req.ean}


@app.post("/admin/requests/{request_id}/reject")
def reject_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    req = db.query(ProductRequest).filter(ProductRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не було знайдено.")
    req.status = "rejected"
    db.commit()
    return {"status": "rejected"}


# -------------------------
# Admin — add product manually
# -------------------------

@app.post("/admin/products", response_model=ProductSummary)
def admin_add_product(body: ManualProductCreate, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    existing = db.query(Product).filter(Product.ean == body.ean).first()
    if existing:
        raise HTTPException(status_code=409, detail="Продукт вже існує.")
    product = Product(**body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return _make_summary(product, db)


# -------------------------
# Admin — edit product
# -------------------------

@app.put("/admin/products/{ean}", response_model=ProductSummary)
def admin_edit_product(ean: str, body: ManualProductEdit, db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    product = db.query(Product).filter(Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не було знайдено.")
    product.name        = body.name
    product.brand       = body.brand
    product.image_url   = body.image_url
    product.description = body.description
    db.commit()
    db.refresh(product)
    return _make_summary(product, db)


# -------------------------
# Admin — upload product image
# -------------------------

@app.post("/admin/products/{ean}/image", response_model=ProductSummary)
async def upload_product_image(
    ean:  str,
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    user: User       = Depends(get_admin_user),
):
    product = db.query(Product).filter(Product.ean == ean).first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не було знайдено.")

    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Тільки зображення у форматі JPEG, PNG та WebP дозволено.")

    if product.image_url and product.image_url.startswith("/uploads/"):
        old_path = product.image_url.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    ext      = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{ean}_{uuid.uuid4().hex[:8]}.{ext}"
    path     = f"uploads/{filename}"

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    product.image_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(product)
    return _make_summary(product, db)


# -------------------------
# Admin — stats dashboard
# -------------------------

@app.get("/admin/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), user: User = Depends(get_admin_user)):
    total_products   = db.query(Product).count()
    total_users      = db.query(User).filter(not User.is_admin).count()
    total_reviews    = db.query(Rating).count()
    reviews_pending  = db.query(Rating).filter(Rating.status == "pending").count()
    reviews_approved = db.query(Rating).filter(Rating.status == "approved").count()
    reviews_rejected = db.query(Rating).filter(Rating.status == "rejected").count()
    requests_pending  = db.query(ProductRequest).filter(ProductRequest.status == "pending").count()
    requests_approved = db.query(ProductRequest).filter(ProductRequest.status == "approved").count()
    requests_rejected = db.query(ProductRequest).filter(ProductRequest.status == "rejected").count()
    overall_avg = db.query(func.avg(Rating.score)).filter(Rating.status == "approved").scalar()

    products = db.query(Product).all()
    top_list = []
    for p in products:
        avg   = db.query(func.avg(Rating.score)).filter(Rating.product_id == p.id, Rating.status == "approved").scalar()
        count = db.query(Rating).filter(Rating.product_id == p.id, Rating.status == "approved").count()
        if avg and count >= 2:
            top_list.append(TopProduct(ean=p.ean, name=p.name, average_rating=round(float(avg), 2), total_ratings=count))
    top_list.sort(key=lambda x: x.average_rating, reverse=True)

    users = db.query(User).filter(not User.is_admin).all()
    user_activity = []
    for u in users:
        count = db.query(Rating).filter(Rating.user_id == u.id, Rating.status == "approved").count()
        if count > 0:
            user_activity.append(ActiveUser(email=u.email, review_count=count))
    user_activity.sort(key=lambda x: x.review_count, reverse=True)

    reg_rows = db.query(cast(User.created_at, Date).label("date"), func.count(User.id).label("count"))\
                 .filter(not User.is_admin)\
                 .group_by(cast(User.created_at, Date))\
                 .order_by(cast(User.created_at, Date)).all()

    rev_rows = db.query(cast(Rating.created_at, Date).label("date"), func.count(Rating.id).label("count"))\
                 .group_by(cast(Rating.created_at, Date))\
                 .order_by(cast(Rating.created_at, Date)).all()

    return StatsOut(
        total_products=total_products,
        total_users=total_users,
        total_reviews=total_reviews,
        reviews_pending=reviews_pending,
        reviews_approved=reviews_approved,
        reviews_rejected=reviews_rejected,
        requests_pending=requests_pending,
        requests_approved=requests_approved,
        requests_rejected=requests_rejected,
        average_rating_overall=round(float(overall_avg), 2) if overall_avg else None,
        top_products=top_list[:5],
        most_active_users=user_activity[:5],
        registrations_per_day=[DailyActivity(date=str(r.date), count=r.count) for r in reg_rows],
        reviews_per_day=[DailyActivity(date=str(r.date), count=r.count) for r in rev_rows],
    )
