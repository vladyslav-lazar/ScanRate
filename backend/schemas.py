from pydantic import BaseModel, Field
from datetime import datetime


# -------------------------
# Auth
# -------------------------

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")

class TokenResponse(BaseModel):
    access_token: str
    is_admin:     bool

class UserOut(BaseModel):
    id:       int
    email:    str
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)


# -------------------------
# Ratings
# -------------------------

class RatingCreate(BaseModel):
    score:   int = Field(..., ge=1, le=5)
    comment: str | None = None

class RatingOut(BaseModel):
    id:         int
    score:      int
    comment:    str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RatingAdminOut(BaseModel):
    id:           int
    score:        int
    comment:      str | None
    status:       str
    created_at:   datetime
    product_ean:  str
    product_name: str | None
    model_config = ConfigDict(from_attributes=True)


# -------------------------
# Products
# -------------------------

class ProductSummary(BaseModel):
    id:             int
    ean:            str
    name:           str | None
    brand:          str | None
    image_url:      str | None
    description:    str | None
    average_rating: float | None
    total_ratings:  int
    model_config = ConfigDict(from_attributes=True)

class ProductOut(ProductSummary):
    ratings: list[RatingOut]

class ProductLookup(BaseModel):
    ean:         str
    name:        str | None
    brand:       str | None
    image_url:   str | None
    description: str | None
    in_local_db: bool

class ProductRequestOut(BaseModel):
    id:          int
    ean:         str
    name:        str | None
    brand:       str | None
    image_url:   str | None
    description: str | None
    status:      str
    created_at:  datetime
    model_config = ConfigDict(from_attributes=True)

class ManualProductCreate(BaseModel):
    ean:         str = Field(..., min_length=13, max_length=13)
    name:        str
    brand:       str | None = None
    image_url:   str | None = None
    description: str | None = None

class ManualProductEdit(BaseModel):
    name:        str
    brand:       str | None = None
    image_url:   str | None = None
    description: str | None = None


# -------------------------
# Admin stats
# -------------------------

class TopProduct(BaseModel):
    ean:            str
    name:           str | None
    average_rating: float
    total_ratings:  int

class ActiveUser(BaseModel):
    email:        str
    review_count: int

class DailyActivity(BaseModel):
    date:  str
    count: int

class StatsOut(BaseModel):
    total_products:          int
    total_users:             int
    total_reviews:           int
    reviews_pending:         int
    reviews_approved:        int
    reviews_rejected:        int
    requests_pending:        int
    requests_approved:       int
    requests_rejected:       int
    average_rating_overall:  float | None
    top_products:            list[TopProduct]
    most_active_users:       list[ActiveUser]
    registrations_per_day:   list[DailyActivity]
    reviews_per_day:         list[DailyActivity]


class RatingEdit(BaseModel):
    score:   int = Field(..., ge=1, le=5)
    comment: str | None = None

class RatingOutWithStatus(RatingOut):
    """Extended rating info returned to the owner so they can see their review status."""
    status:  str
    user_id: int
    model_config = ConfigDict(from_attributes=True)
