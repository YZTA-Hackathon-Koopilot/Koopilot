from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from datetime import datetime, timedelta
from database import get_db
import models

router = APIRouter(
    prefix="/shipping",
    tags=["Shipping"]
)

@router.get("/active", summary="Takip edilebilir tüm kargoları listele")
def get_active_shipments(db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(
        models.Order.status != models.OrderStatus.DRAFT
    ).order_by(models.Order.order_date.desc()).all()
    
    results = []
    for order in orders:
        results.append(get_shipping_status(order.id, db))
    return results

@router.put("/{order_id}/status", summary="Kargo durumunu manuel güncelle")
def update_shipping_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    order.shipping_status = status
    order.shipping_updated_at = datetime.utcnow()
    
    
    db.commit()
    db.refresh(order)
    return get_shipping_status(order_id, db)

@router.get("/status/{order_id}", summary="Kargo durumu sorgulama")
def get_shipping_status(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    if order.status == models.OrderStatus.DRAFT:
        return {
            "order_id": order_id, 
            "shipping_status": "Henüz onaylanmadı",
            "estimated_delivery": None,
            "updated_at": None
        }
    
    return {
        "order_id": order_id,
        "shipping_status": order.shipping_status or "Hazırlanıyor",
        "carrier": "Aras Kargo (Mock)",
        "estimated_delivery": (order.order_date + timedelta(days=3)).strftime("%Y-%m-%d") if order.order_date else None,
        "updated_at": order.shipping_updated_at.strftime("%Y-%m-%d %H:%M") if order.shipping_updated_at else "Henüz güncellenmedi"
    }