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
from ai_agent import analyze_message_with_ai, decide_staff_action_with_ai, compose_staff_response_with_ai
from routers.auth import get_current_user

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
    dependencies=[Depends(get_current_user)]
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


def _staff_response(text: str, intent: str = "staff_assistant", warnings: list[str] | None = None):
    return {
        "ai_analysis": {
            "intent": intent,
            "customer_name": None,
            "phone": None,
            "address": None,
            "products": [],
            "city": None,
            "missing_info": [],
            "ai_reply_draft": text,
        },
        "created_order": None,
        "shipping_info": None,
        "warnings": warnings or [],
    }


def _find_staff_product(message: str, db: Session):
    products = db.query(models.Product).all()
    if not products:
        return None

    normalized = normalize_text(message)
    for product in products:
        if normalize_text(product.name) in normalized:
            return product

    cleaned_query = normalized
    for word in [
        "stok", "stogu", "stokunu", "fiyat", "fiyati", "fiyatini", "guncelle",
        "goster", "listele", "yap", "olarak", "ayarla", "urun", "urunu",
    ]:
        cleaned_query = re.sub(rf"\b{word}\b", " ", cleaned_query)
    cleaned_query = re.sub(r"\d+(?:[,.]\d+)?", " ", cleaned_query).strip()

    return find_best_product(cleaned_query or message, products)


def _strip_customer_message_prefix(message: str):
    match = re.search(
        r"(?:müşteri|musteri)\s*(?:mesajı|mesaji|yazdı|yazdi|dedi)?\s*[:=-]\s*(.+)",
        message,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else message


def _serialize_product(product: models.Product):
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "unit": product.unit,
        "stock": product.stock,
        "price": product.price,
    }


def _serialize_order(order: models.Order):
    total = 0.0
    items = []
    for item in order.items:
        line_total = (item.price or 0) * (item.quantity or 0)
        total += line_total
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "unit": item.unit,
            "price": item.price,
            "line_total": line_total,
        })

    return {
        "id": order.id,
        "status": order.status.value if order.status else None,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "city": order.city,
        "address": order.address,
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "missing_info": order.missing_info,
        "ai_reply_draft": order.ai_reply_draft,
        "shipping_status": order.shipping_status,
        "shipping_updated_at": order.shipping_updated_at.isoformat() if order.shipping_updated_at else None,
        "packaging_hint": order.packaging_hint,
        "items": items,
        "total": total,
    }


def _resolve_order_statuses(status_text: str | None, default_active: bool = False):
    if not status_text:
        if default_active:
            return [models.OrderStatus.DRAFT, models.OrderStatus.APPROVED, models.OrderStatus.SHIPPED]
        return None

    normalized = normalize_text(status_text)
    if any(word in normalized for word in ["all", "tum", "hepsi"]):
        return None
    if any(word in normalized for word in ["active", "aktif", "acik"]):
        return [models.OrderStatus.DRAFT, models.OrderStatus.APPROVED, models.OrderStatus.SHIPPED]
    if any(word in normalized for word in ["draft", "taslak"]):
        return [models.OrderStatus.DRAFT]
    if any(word in normalized for word in ["approved", "onay"]):
        return [models.OrderStatus.APPROVED]
    if any(word in normalized for word in ["shipped", "kargo", "yolda"]):
        return [models.OrderStatus.SHIPPED]
    if any(word in normalized for word in ["rejected", "red", "reddedildi", "iptal"]):
        return [models.OrderStatus.REJECTED, models.OrderStatus.CANCELLED]
    return [models.OrderStatus.DRAFT, models.OrderStatus.APPROVED, models.OrderStatus.SHIPPED] if default_active else None


COMMON_FEMALE_NAMES = {
    "ayse", "fatma", "zeynep", "zehra", "elif", "emel", "esra", "ece",
    "merve", "busra", "kubra", "sena", "sude", "melis", "deniz", "dilara",
}

COMMON_MALE_NAMES = {
    "ahmet", "mehmet", "muhammed", "kaan", "enes", "atil", "ali", "veli",
    "mustafa", "emre", "burak", "furkan", "yusuf", "omer", "hasan", "huseyin",
}


def _build_staff_address(name: str | None):
    if not name:
        return None

    first_name = name.strip().split()[0]
    if not first_name:
        return None

    normalized = normalize_text(first_name)
    if normalized == "demo":
        return "Demo Kullanıcı"
    if normalized in COMMON_FEMALE_NAMES:
        return f"{first_name} Hanım"
    if normalized in COMMON_MALE_NAMES:
        return f"{first_name} Bey"
    return f"Sayın {first_name}"


def _build_staff_context(db: Session, current_user: models.User | None):
    products = db.query(models.Product).order_by(models.Product.stock.asc()).limit(20).all()
    recent_orders = db.query(models.Order).order_by(models.Order.order_date.desc()).limit(12).all()
    low_stock_count = db.query(models.Product).filter(models.Product.stock < 5).count()
    draft_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.DRAFT).count()
    approved_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.APPROVED).count()
    shipped_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.SHIPPED).count()

    return {
        "assistant_identity": "Koopilot panel içi personel operasyon asistanı",
        "current_date": date.today().isoformat(),
        "current_user": {
            "id": current_user.id if current_user else None,
            "name": current_user.name if current_user else None,
            "first_name": current_user.name.strip().split()[0] if current_user and current_user.name else None,
            "preferred_address": _build_staff_address(current_user.name if current_user else None),
            "email": current_user.email if current_user else None,
            "role": current_user.role if current_user else None,
        },
        "capabilities": [
            "personelle doğal sohbet",
            "sipariş listeleme ve detay gösterme",
            "taslak sipariş onaylama, reddetme ve silme",
            "stok/fiyat listeleme ve güncelleme",
            "yeni ürün ekleme",
            "kargo durumlarını listeleme ve güncelleme",
            "günlük operasyon özeti",
            "yapıştırılan müşteri mesajını sipariş taslağına dönüştürme",
        ],
        "metrics": {
            "draft_orders": draft_count,
            "approved_orders": approved_count,
            "shipped_orders": shipped_count,
            "critical_stock_products": low_stock_count,
        },
        "recent_orders": [_serialize_order(order) for order in recent_orders],
        "inventory_snapshot": [_serialize_product(product) for product in products],
    }


def _build_staff_history(session_id: str | None, db: Session):
    if not session_id:
        return []

    logs = db.query(models.MessageLog).filter(
        models.MessageLog.session_id == session_id,
        models.MessageLog.intent.ilike("staff_%"),
    ).order_by(models.MessageLog.created_at.desc()).limit(8).all()
    logs.reverse()
    return [
        {
            "personel": log.raw_message,
            "koopilot": log.ai_reply_draft,
            "intent": log.intent,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


def _get_order_operation(order_id: int | None, db: Session):
    if not order_id:
        return None, {"ok": False, "error": "Sipariş id eksik."}

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None, {"ok": False, "error": f"Sipariş #{order_id} bulunamadı."}
    return order, None


def _normalize_shipping_status(status: str | None):
    normalized = normalize_text(status or "")
    if "teslim" in normalized:
        return "Teslim Edildi"
    if "yolda" in normalized:
        return "Yolda"
    if "verildi" in normalized or "kargoya" in normalized:
        return "Kargoya Verildi"
    if "hazir" in normalized or "hazirlaniyor" in normalized:
        return "Hazırlanıyor"
    return status or "Hazırlanıyor"


def _execute_staff_decision(decision: schemas.StaffAssistantDecision, message: str, session_id: str | None, db: Session):
    action = decision.action
    normalized = normalize_text(message)

    if action in {"chat", "unknown"}:
        return {
            "ok": True,
            "executed": False,
            "action": action,
            "gemini_response": decision.response,
        }

    if action == "list_orders":
        statuses = _resolve_order_statuses(decision.order_status, default_active=True)
        query = db.query(models.Order)
        if statuses is not None:
            query = query.filter(models.Order.status.in_(statuses))
        orders = query.order_by(models.Order.order_date.desc()).limit(15).all()
        return {
            "ok": True,
            "executed": True,
            "action": action,
            "orders": [_serialize_order(order) for order in orders],
            "count": len(orders),
        }

    if action == "order_detail":
        order, error = _get_order_operation(decision.order_id, db)
        if error:
            return {"executed": False, "action": action, **error}
        return {"ok": True, "executed": True, "action": action, "order": _serialize_order(order)}

    if action == "approve_order":
        order, error = _get_order_operation(decision.order_id, db)
        if error:
            return {"executed": False, "action": action, **error}
        if order.status != models.OrderStatus.DRAFT:
            return {
                "ok": False,
                "executed": False,
                "action": action,
                "error": "Sadece Taslak durumundaki siparişler onaylanabilir.",
                "order": _serialize_order(order),
            }
        if order.missing_info:
            return {
                "ok": False,
                "executed": False,
                "action": action,
                "error": f"Siparişte eksik bilgiler var: {order.missing_info}",
                "order": _serialize_order(order),
            }
        if not order.items:
            return {
                "ok": False,
                "executed": False,
                "action": action,
                "error": "Siparişte ürün kalemi bulunmuyor.",
                "order": _serialize_order(order),
            }
        try:
            for item in order.items:
                if item.quantity is None or item.quantity <= 0:
                    raise ValueError("Sipariş kalemlerinde miktarı eksik veya geçersiz ürün var.")
                product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
                if not product:
                    raise ValueError(f"Sipariş kalemi için ürün bulunamadı: {item.product_id}")
                if product.stock < item.quantity:
                    raise ValueError(f"{product.name} için yetersiz stok. Mevcut: {product.stock:g} {product.unit}, istenen: {item.quantity:g}.")
                product.stock -= item.quantity
            order.status = models.OrderStatus.APPROVED
            db.commit()
            db.refresh(order)
            return {"ok": True, "executed": True, "action": action, "order": _serialize_order(order)}
        except ValueError as exc:
            db.rollback()
            return {"ok": False, "executed": False, "action": action, "error": str(exc)}

    if action == "reject_order":
        order, error = _get_order_operation(decision.order_id, db)
        if error:
            return {"executed": False, "action": action, **error}
        if order.status == models.OrderStatus.APPROVED:
            for item in order.items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
                if product and item.quantity:
                    product.stock += item.quantity
        order.status = models.OrderStatus.REJECTED
        db.commit()
        db.refresh(order)
        return {"ok": True, "executed": True, "action": action, "order": _serialize_order(order)}

    if action == "delete_order":
        order, error = _get_order_operation(decision.order_id, db)
        if error:
            return {"executed": False, "action": action, **error}
        serialized = _serialize_order(order)
        if order.status == models.OrderStatus.APPROVED:
            for item in order.items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
                if product and item.quantity:
                    product.stock += item.quantity
        db.delete(order)
        db.commit()
        return {"ok": True, "executed": True, "action": action, "deleted_order": serialized}

    if action == "list_products":
        query = db.query(models.Product)
        if any(word in normalized for word in ["kritik", "dusuk", "az", "biten", "tukenen", "uyari"]):
            query = query.filter(models.Product.stock < 10)
        products = query.order_by(models.Product.stock.asc()).limit(20).all()
        return {
            "ok": True,
            "executed": True,
            "action": action,
            "products": [_serialize_product(product) for product in products],
            "count": len(products),
        }

    if action == "product_detail":
        product = _find_staff_product(decision.product_name or message, db)
        if not product:
            return {"ok": False, "executed": False, "action": action, "error": "Ürün bulunamadı."}
        return {"ok": True, "executed": True, "action": action, "product": _serialize_product(product)}

    if action == "update_product":
        product_name = decision.product_name or (decision.product.name if decision.product else None) or message
        product = _find_staff_product(product_name, db)
        if not product:
            return {"ok": False, "executed": False, "action": action, "error": "Güncellenecek ürün bulunamadı."}

        stock = decision.stock
        price = decision.price
        if decision.product:
            stock = decision.product.stock if decision.product.stock is not None else stock
            price = decision.product.price if decision.product.price is not None else price

        updates = {}
        if stock is not None:
            product.stock = stock
            updates["stock"] = stock
        if price is not None:
            product.price = price
            updates["price"] = price

        if not updates:
            return {
                "ok": False,
                "executed": False,
                "action": action,
                "error": "Güncellenecek stok veya fiyat değeri eksik.",
                "product": _serialize_product(product),
            }

        db.commit()
        db.refresh(product)
        return {"ok": True, "executed": True, "action": action, "updates": updates, "product": _serialize_product(product)}

    if action == "create_product":
        payload = decision.product
        if not payload:
            return {"ok": False, "executed": False, "action": action, "error": "Ürün bilgileri eksik."}
        missing = []
        if not payload.name:
            missing.append("ürün adı")
        if payload.stock is None:
            missing.append("stok")
        if payload.price is None:
            missing.append("fiyat")
        if missing:
            return {"ok": False, "executed": False, "action": action, "error": "Eksik bilgiler: " + ", ".join(missing)}

        existing = db.query(models.Product).filter(models.Product.name == payload.name).first()
        if existing:
            return {"ok": False, "executed": False, "action": action, "error": "Aynı isimde ürün zaten var.", "product": _serialize_product(existing)}

        product = models.Product(
            name=payload.name,
            description=payload.description or "",
            category=payload.category or "Genel",
            unit=payload.unit or "Adet",
            stock=payload.stock,
            price=payload.price,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return {"ok": True, "executed": True, "action": action, "product": _serialize_product(product)}

    if action == "list_shipments":
        orders = db.query(models.Order).filter(
            models.Order.status.in_([models.OrderStatus.APPROVED, models.OrderStatus.SHIPPED])
        ).order_by(models.Order.order_date.desc()).limit(15).all()
        return {
            "ok": True,
            "executed": True,
            "action": action,
            "orders": [_serialize_order(order) for order in orders],
            "count": len(orders),
        }

    if action == "update_shipping":
        order, error = _get_order_operation(decision.order_id, db)
        if error:
            return {"executed": False, "action": action, **error}
        order.shipping_status = _normalize_shipping_status(decision.shipping_status or message)
        order.shipping_updated_at = datetime.utcnow()
        if order.shipping_status == "Kargoya Verildi":
            order.status = models.OrderStatus.SHIPPED
        db.commit()
        db.refresh(order)
        return {"ok": True, "executed": True, "action": action, "order": _serialize_order(order)}

    if action == "daily_summary":
        today = date.today()
        total_messages = db.query(models.MessageLog).filter(func.date(models.MessageLog.created_at) == today).count()
        draft_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.DRAFT).count()
        approved_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.APPROVED).count()
        shipped_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.SHIPPED).count()
        low_stock_products = db.query(models.Product).filter(models.Product.stock < 10).order_by(models.Product.stock.asc()).limit(10).all()
        return {
            "ok": True,
            "executed": True,
            "action": action,
            "summary": {
                "date": today.isoformat(),
                "messages_today": total_messages,
                "draft_orders": draft_count,
                "approved_orders": approved_count,
                "shipped_orders": shipped_count,
                "low_stock_products": [_serialize_product(product) for product in low_stock_products],
            },
        }

    if action == "analyze_customer_message":
        customer_message = decision.customer_message or _strip_customer_message_prefix(message)
        customer_flow = process_message(customer_message, session_id, db)
        return {
            "ok": True,
            "executed": True,
            "action": action,
            "customer_message": customer_message,
            "customer_flow": customer_flow,
        }

    return {
        "ok": False,
        "executed": False,
        "action": action,
        "error": "Desteklenmeyen operasyon.",
    }


def process_staff_message(message: str, session_id: str | None, db: Session, current_user: models.User | None = None):
    context = _build_staff_context(db, current_user)
    history = _build_staff_history(session_id, db)
    decision = decide_staff_action_with_ai(message, context=context, history=history)
    operation_result = _execute_staff_decision(decision, message, session_id, db)
    refreshed_context = _build_staff_context(db, current_user)

    if decision.action in {"chat", "unknown"} and operation_result.get("ok"):
        final_text = decision.response
    else:
        final_text = compose_staff_response_with_ai(
            message=message,
            context=refreshed_context,
            decision=decision,
            operation_result=operation_result,
            history=history,
        )

    log_entry = models.MessageLog(
        session_id=session_id,
        raw_message=message,
        intent=f"staff_{decision.action}",
        ai_reply_draft=final_text,
    )
    db.add(log_entry)
    db.commit()

    return _staff_response(
        final_text,
        intent=f"staff_{decision.action}",
        warnings=[] if operation_result.get("ok") else [operation_result.get("error", "İşlem tamamlanamadı.")],
    )


@router.post("/analyze-message", summary="Müşteri mesajını analiz et ve niyetine göre aksiyon al")
def analyze_message(request: schemas.MessageRequest, db: Session = Depends(get_db)):
    client_id = request.session_id or "anonymous"
    check_rate_limit(client_id)

    try:
        return process_message(request.message, request.session_id, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sistem Hatası: {str(e)}")


@router.post("/staff-assistant", summary="Personel operasyon asistanı")
def staff_assistant(
    request: schemas.MessageRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    client_id = f"staff_{request.session_id or 'anonymous'}"
    check_rate_limit(client_id)

    try:
        return process_staff_message(request.message, request.session_id, db, current_user)
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
    
    low_stock_products = db.query(models.Product).filter(models.Product.stock < 10).all()
    low_stock_count = len(low_stock_products)
    
    # Smart Insights generation
    insights = []
    
    # Insight 1: Intent Analysis
    order_count = intent_dist.get("new_order", 0)
    if order_count > 0:
        insights.append({
            "title": "Sipariş Yoğunluğu",
            "text": f"Bugünkü mesajların %{int((order_count/total_messages)*100) if total_messages > 0 else 0}'si yeni sipariş talebi içeriyor.",
            "type": "positive"
        })
    
    # Insight 2: Stock Warning
    if low_stock_count > 0:
        p_names = ", ".join([p.name for p in low_stock_products[:2]])
        insights.append({
            "title": "Kritik Stok Uyarısı",
            "text": f"{p_names} dahil {low_stock_count} ürün kritik seviyenin altında.",
            "type": "warning"
        })
    else:
        insights.append({
            "title": "Stok Durumu",
            "text": "Tüm popüler ürünlerde stok seviyeleri şu an için yeterli görünüyor.",
            "type": "positive"
        })

    # Insight 3: Demand signal
    insights.append({
        "title": "Talep Sinyali",
        "text": "Bugünkü mesaj dağılımı sipariş, stok ve kargo niyetlerine ayrılarak operasyon panelinde takip ediliyor.",
        "type": "info"
    })
    
    # Insight 4: Efficiency
    insights.append({
        "title": "Operasyonel Verimlilik",
        "text": "AI ajanı gelen mesajları yapılandırılmış aksiyonlara dönüştürerek manuel takip yükünü azaltmaya yardımcı oluyor.",
        "type": "success"
    })

    return {
        "date": today.isoformat(),
        "total_messages": total_messages,
        "intent_distribution": intent_dist,
        "low_stock_count": low_stock_count,
        "insights": insights,
        "summary_text": f"Bugün toplam {total_messages} mesaj alındı. {low_stock_count} ürün için aksiyon almanız öneriliyor."
    }
    
@router.post("/campaign-recommendation", summary="Satılmayan ürün için kampanya önerisi al")
def get_campaign_recommendation(request: schemas.ProductResponse, db: Session = Depends(get_db)):
    from ai_agent import generate_campaign_suggestion
    try:
        recommendation = generate_campaign_suggestion(
            product_name=request.name,
            price=request.price,
            stock=request.stock
        )
        return {"recommendation": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Öneri oluşturulamadı: {str(e)}")
