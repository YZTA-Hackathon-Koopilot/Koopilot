from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.get("", response_model=List[schemas.OrderResponse], summary="Tüm siparişleri listele")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    return orders

@router.put("/{order_id}/approve", response_model=schemas.OrderResponse, summary="Siparişi onayla ve stoktan düş")
def approve_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if order.status != models.OrderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Sadece 'Taslak' durumundaki siparişler onaylanabilir.")
    if order.missing_info:
        raise HTTPException(status_code=400, detail=f"Siparişte eksik bilgiler var: {order.missing_info}")
    if not order.items:
        raise HTTPException(status_code=400, detail="Siparişte onaylanacak ürün kalemi bulunmuyor.")
    
    try:
        for item in order.items:
            if item.quantity is None or item.quantity <= 0:
                raise ValueError("Sipariş kalemlerinde miktarı eksik veya geçersiz ürün var.")
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise ValueError(f"Sipariş kalemi için ürün bulunamadı: {item.product_id}")
            if product.stock < item.quantity:
                raise ValueError(f"'{product.name}' ürünü için yetersiz stok! (Mevcut: {product.stock}, İstenen: {item.quantity})")
            product.stock -= item.quantity
        
        order.status = models.OrderStatus.APPROVED
        db.commit()
        db.refresh(order)
        return order
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Stok güncellenirken beklenmeyen bir hata oluştu.")

@router.put("/{order_id}/reject", response_model=schemas.OrderResponse, summary="Siparişi reddet/iptal et")
def reject_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    if order.status == models.OrderStatus.APPROVED:
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity
                
    order.status = models.OrderStatus.REJECTED
    db.commit()
    db.refresh(order)
    return order

@router.delete("/{order_id}", summary="Siparişi kalıcı olarak sil")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    if order.status == models.OrderStatus.APPROVED:
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity
                
    db.delete(order)
    db.commit()
    return {"status": "success", "message": f"Sipariş #{order_id} silindi."}
