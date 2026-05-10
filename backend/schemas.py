from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models import OrderStatus
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    unit: str = "Adet"
    stock: float = Field(..., ge=0, description="Ürün stok adedi negatif olamaz")
    price: float = Field(..., ge=0.0, description="Ürün fiyatı negatif olamaz")
class ProductCreate(ProductBase):
    pass
class ProductResponse(ProductBase):
    id: int
    class Config:
        from_attributes = True
class OrderItemBase(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0, description="Sipariş adedi en az 1 olmalıdır")
class OrderItemResponse(OrderItemBase):
    id: int
    product_name: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    class Config:
        from_attributes = True
class OrderBase(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
class OrderCreate(OrderBase):
    items: List[OrderItemBase]
class OrderResponse(OrderBase):
    id: int
    status: OrderStatus
    order_date: datetime
    items: List[OrderItemResponse]
    missing_info: Optional[str] = None
    ai_reply_draft: Optional[str] = None
    class Config:
        from_attributes = True
class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Müşteri mesajı (Max 1000 karakter)")
    session_id: Optional[str] = Field(None, max_length=50, description="Oturum kimliği (Max 50 karakter)")
class AIParsedProduct(BaseModel):
    name: str = Field(description="Müşterinin sipariş etmek istediği ürünün adı")
    quantity: Optional[float] = Field(None, description="Müşterinin sipariş etmek istediği ürünün miktarı (kg veya adet olarak)")
    unit: Optional[str] = Field(None, description="Müşterinin belirttiği veya ürün için gerekli birim (kg, kavanoz, adet vb.)")
class AIFinalResponse(BaseModel):
    intent: str = Field(description="Mesajın amacı: 'new_order', 'shipping_query', 'general_question', 'complaint' veya 'return_request' olmalıdır.")
    customer_name: Optional[str] = Field(None, description="Mesajda geçiyorsa müşterinin adı soyadı")
    phone: Optional[str] = Field(None, description="Mesajda geçiyorsa müşterinin telefon numarası")
    address: Optional[str] = Field(None, description="Mesajda geçiyorsa müşterinin açık adresi")
    products: List[AIParsedProduct] = Field(default_factory=list, description="Müşterinin sipariş etmek istediği ürünler ve adetleri")
    city: Optional[str] = Field(None, description="Teslimat veya bilgi istenen şehir adı")
    missing_info: List[str] = Field(default_factory=list, description="Eğer intent 'new_order' ise, sipariş için eksik olan bilgilerin listesi (örneğin: 'telefon', 'açık adres', 'isim')")
    ai_reply_draft: str = Field(description="Müşteriye gönderilmek üzere hazırlanmış, nazik ve profesyonel taslak cevap.")
