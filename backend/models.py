from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base
class OrderStatus(str, enum.Enum):
    DRAFT = "Taslak"
    APPROVED = "Onaylandı"
    SHIPPED = "Kargoda"
    CANCELLED = "İptal"
    REJECTED = "Reddedildi"
    DELETED = "Silindi"
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    category = Column(String)
    unit = Column(String, default="Adet")
    stock = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=True)
    customer_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    order_date = Column(DateTime, default=datetime.utcnow)
    missing_info = Column(String, nullable=True)
    ai_reply_draft = Column(String, nullable=True)
    shipping_status = Column(String, default="Hazırlanıyor")
    shipping_updated_at = Column(DateTime, nullable=True)
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, nullable=True)
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    @property
    def product_name(self):
        return self.product.name if self.product else None

    @property
    def unit(self):
        return self.product.unit if self.product else None

    @property
    def price(self):
        return self.product.price if self.product else None
class MessageLog(Base):
    __tablename__ = "message_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=True)
    raw_message = Column(String)
    intent = Column(String)
    ai_reply_draft = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
