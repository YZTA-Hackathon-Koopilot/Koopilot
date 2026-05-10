from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import time
import re
from difflib import SequenceMatcher
from database import get_db
import models
import schemas
from ai_agent import analyze_message_with_ai

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

RATE_LIMIT_STORE = {}
RATE_LIMIT_SECONDS = 10
RATE_LIMIT_REQUESTS = 5

COMPANY_PROFILE = "Koopilot - Akıllı Operasyon ve Sipariş Yönetim Sistemi"


def normalize_text(value: str) -> str:
    replacements = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    cleaned = value.translate(replacements).lower()
    return re.sub(r"[^a-z0-9\s]", " ", cleaned)


def find_best_product(ai_product_name: str, products: list[models.Product]):
    query = normalize_text(ai_product_name)
    query_tokens = set(query.split())
    best_product = None
    best_score = 0.0

    for product in products:
        haystack = normalize_text(f"{product.name} {product.description or ''} {product.category}")
        haystack_tokens = set(haystack.split())
        token_score = len(query_tokens & haystack_tokens) / max(len(query_tokens), 1)
        fuzzy_score = SequenceMatcher(None, query, normalize_text(product.name)).ratio()
        score = max(token_score, fuzzy_score)
        if score > best_score:
            best_product = product
            best_score = score

    return best_product if best_score >= 0.45 else None


def check_rate_limit(client_id: str):
    current_time = time.time()

    if client_id not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[client_id] = []

    RATE_LIMIT_STORE[client_id] = [t for t in RATE_LIMIT_STORE[client_id] if current_time - t < RATE_LIMIT_SECONDS]

    if len(RATE_LIMIT_STORE[client_id]) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Çok fazla istek gönderdiniz. Lütfen {RATE_LIMIT_SECONDS} saniye bekleyin."
        )

    RATE_LIMIT_STORE[client_id].append(current_time)


def process_message(message: str, session_id: str | None, db: Session):
    history_text = ""
    if session_id:
        past_logs = db.query(models.MessageLog).filter(
            models.MessageLog.session_id == session_id
        ).order_by(models.MessageLog.created_at.desc()).limit(5).all()

        if past_logs:
            past_logs.reverse()
            history_lines = []
            for log in past_logs:
                history_lines.append(f"Müşteri: {log.raw_message}")
                if log.ai_reply_draft:
                    history_lines.append(f"Ajan: {log.ai_reply_draft}")
            history_text = "\n".join(history_lines)

    all_products = db.query(models.Product).all()
    catalog_lines = []
    for p in all_products:
        catalog_lines.append(f"- {p.name} | Kategori: {p.category} | Fiyat: {p.price} TL | Stok: {p.stock} {p.unit}")
    catalog_text = "\n".join(catalog_lines)

    ai_result = analyze_message_with_ai(
        message,
        company_profile=COMPANY_PROFILE,
        history=history_text,
        catalog=catalog_text
    )

    log_entry = models.MessageLog(
        session_id=session_id,
        raw_message=message,
        intent=ai_result.intent,
        ai_reply_draft=ai_result.ai_reply_draft
    )
    db.add(log_entry)
    db.commit()

    response_data = {
        "ai_analysis": ai_result.model_dump(),
        "created_order": None,
        "shipping_info": None,
        "warnings": []
    }

    if ai_result.intent == "new_order":
        existing_draft = None
        if session_id:
            existing_draft = db.query(models.Order).filter(
                models.Order.session_id == session_id,
                models.Order.status == models.OrderStatus.DRAFT
            ).first()

        if existing_draft:
            if ai_result.customer_name: existing_draft.customer_name = ai_result.customer_name
            if ai_result.phone: existing_draft.phone = ai_result.phone
            if ai_result.city: existing_draft.city = ai_result.city
            if ai_result.address: existing_draft.address = ai_result.address

            missing = set(ai_result.missing_info)
            if not existing_draft.customer_name: missing.add("isim")
            if not existing_draft.phone: missing.add("telefon")
            if not existing_draft.address: missing.add("adres")

            existing_draft.missing_info = ", ".join(sorted(list(missing))) if missing else None
            existing_draft.ai_reply_draft = ai_result.ai_reply_draft
            active_order = existing_draft
        else:
            missing = set(ai_result.missing_info)
            if not ai_result.customer_name: missing.add("isim")
            if not ai_result.phone: missing.add("telefon")
            if not ai_result.address: missing.add("adres")

            new_order = models.Order(
                session_id=session_id,
                customer_name=ai_result.customer_name,
                phone=ai_result.phone,
                city=ai_result.city,
                address=ai_result.address,
                status=models.OrderStatus.DRAFT,
                missing_info=", ".join(sorted(missing)) if missing else None,
                ai_reply_draft=ai_result.ai_reply_draft
            )
            db.add(new_order)
            db.flush()
            active_order = new_order

        warnings = []
        stock_info_list = []
        all_products = db.query(models.Product).all()
        for ai_product in ai_result.products:
            matched_product = find_best_product(ai_product.name, all_products)
            if matched_product:
                if ai_product.quantity is None or ai_product.quantity <= 0:
                    warnings.append(f"'{matched_product.name}' için miktar eksik olduğu için sipariş kalemi beklemeye alındı.")
                    continue

                existing_item = db.query(models.OrderItem).filter(
                    models.OrderItem.order_id == active_order.id,
                    models.OrderItem.product_id == matched_product.id
                ).first()

                if existing_item:
                    existing_item.quantity = ai_product.quantity
                else:
                    order_item = models.OrderItem(
                        order_id=active_order.id,
                        product_id=matched_product.id,
                        quantity=ai_product.quantity
                    )
                    db.add(order_item)

                stock_info_list.append(f"{matched_product.name} ({matched_product.stock} {matched_product.unit} mevcut)")
                if matched_product.stock < ai_product.quantity:
                    warnings.append(
                        f"'{matched_product.name}' için stok yetersiz: mevcut {matched_product.stock} {matched_product.unit}, istenen {ai_product.quantity}."
                    )
            else:
                warnings.append(f"'{ai_product.name}' adlı ürün stokta bulunamadı.")

        db.commit()
        db.refresh(active_order)
        if stock_info_list:
            stock_note = " | ".join(stock_info_list)
            response_data["ai_analysis"]["ai_reply_draft"] += f"\n\n[Güncel Stok Bilgisi: {stock_note}]"

        response_data["created_order"] = {
            "order_id": active_order.id,
            "status": active_order.status,
            "missing_info": active_order.missing_info
        }
        response_data["warnings"] = warnings

    elif ai_result.intent == "shipping_query":
        search_query = None
        if ai_result.customer_name:
            search_query = models.Order.customer_name.ilike(f"%{ai_result.customer_name}%")
        elif ai_result.phone:
            search_query = models.Order.phone == ai_result.phone

        if search_query is not None:
            last_order = db.query(models.Order).filter(search_query).order_by(models.Order.order_date.desc()).first()
            if last_order:
                response_data["shipping_info"] = {
                    "order_id": last_order.id,
                    "status": "Yolda" if last_order.status == models.OrderStatus.APPROVED else "Beklemede"
                }
                dynamic_reply = f"Merhaba {last_order.customer_name or 'Sayın Müşterimiz'}, " \
                                f"siparişiniz (ID: {last_order.id}) şu anda işleniyor."
                response_data["ai_analysis"]["ai_reply_draft"] = dynamic_reply
            else:
                response_data["warnings"].append("Müşteriye ait aktif bir sipariş bulunamadı.")
        else:
            response_data["warnings"].append("Kargo sorgusu için isim veya telefon bilgisi eksik.")

    return response_data


@router.post("/analyze-message", summary="Müşteri mesajını analiz et ve niyetine göre aksiyon al")
def analyze_message(request: schemas.MessageRequest, db: Session = Depends(get_db)):
    client_id = request.session_id or "anonymous"
    check_rate_limit(client_id)

    try:
        return process_message(request.message, request.session_id, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sistem Hatası: {str(e)}")

@router.get("/daily-summary", summary="Günlük AI özet raporu")
def get_daily_summary(db: Session = Depends(get_db)):
    today = date.today()
    
    total_messages = db.query(models.MessageLog).filter(
        func.date(models.MessageLog.created_at) == today
    ).count()
    
    intents = db.query(
        models.MessageLog.intent, func.count(models.MessageLog.intent)
    ).filter(
        func.date(models.MessageLog.created_at) == today
    ).group_by(models.MessageLog.intent).all()
    
    intent_dist = {intent: count for intent, count in intents}
    
    low_stock = db.query(models.Product).filter(models.Product.stock < 5).count()
    
    return {
        "date": today.isoformat(),
        "total_messages": total_messages,
        "intent_distribution": intent_dist,
        "low_stock_count": low_stock,
        "summary_text": f"Bugün toplam {total_messages} mesaj alındı. {low_stock} ürün için stok uyarısı mevcut."
    }
