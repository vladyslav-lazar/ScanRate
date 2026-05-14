from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String, unique=True, nullable=False, index=True)
    is_admin   = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ratings    = relationship("Rating", back_populates="user")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False)

    user = relationship("User")


class Product(Base):
    __tablename__ = "products"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    ean         = Column(String(13), unique=True, nullable=False, index=True)
    name        = Column(String, nullable=True)
    brand       = Column(String, nullable=True)
    image_url   = Column(String, nullable=True)
    description = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending | approved | rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ratings = relationship("Rating", back_populates="product")


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("product_id", "user_id", name="uq_product_user"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    score      = Column(Integer, nullable=False)
    comment    = Column(String, nullable=True)
    status     = Column(String, default="pending")  # pending | approved | rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="ratings")
    user    = relationship("User", back_populates="ratings")

    @property
    def product_ean(self):
        return self.product.ean if self.product else None

    @property
    def product_name(self):
        return self.product.name if self.product else None
