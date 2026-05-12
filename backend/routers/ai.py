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


def _format_order_items(order: models.Order):
    if not order.items:
        return "ürün kalemi yok"
    lines = []
    for item in order.items:
        quantity = f"{item.quantity:g}" if item.quantity is not None else "miktar yok"
        lines.append(f"{quantity} {item.unit or 'adet'} {item.product_name or f'Ürün #{item.product_id}'}")
    return ", ".join(lines)


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


def _format_product(product: models.Product):
    return f"{product.name}: {product.stock:g} {product.unit} | {product.price:g} TL"


def _format_order_line(order: models.Order):
    return f"#{order.id} | {order.status.value} | {order.customer_name or 'İsim yok'} | {_format_order_items(order)}"


def _extract_first_number(text: str) -> int | None:
    match = re.search(r"(?:#|no|numara|siparis|sipariş)?\s*(\d+)", text)
    return int(match.group(1)) if match else None


def _extract_decimal_after_keywords(text: str, keywords: list[str]) -> float | None:
    normalized = normalize_text(text)
    for keyword in keywords:
        key = normalize_text(keyword)
        patterns = [
            rf"{key}\w*\s*(?:degerini|degeri|sayisini|miktarini|miktari|fiyatini|fiyati)?\s*(\d+(?:[,.]\d+)?)",
            rf"(\d+(?:[,.]\d+)?)\s*(?:tl|lira|adet|kavanoz|sise|şişe|kg|kilo|litre)?\s*{key}\w*",
        ]
        for pattern in patterns:
            match = re.search(pattern, normalized)
            if match:
                return float(match.group(1).replace(",", "."))
    return None


def _extract_product_payload(message: str):
    def grab(pattern: str):
        match = re.search(pattern, message, flags=re.IGNORECASE)
        return match.group(1).strip(" .,-") if match else None

    name = grab(r"(?:ürün|urun)\s*(?:adı|adi|ismi|ismini)?\s*[:=]\s*([^,\n]+)")
    category = grab(r"kategori\s*[:=]\s*([^,\n]+)")
    unit = grab(r"birim\s*[:=]\s*([^,\n]+)") or "Adet"
    description = grab(r"(?:açıklama|aciklama)\s*[:=]\s*([^,\n]+)") or ""
    stock = _extract_decimal_after_keywords(message, ["stok"])
    price = _extract_decimal_after_keywords(message, ["fiyat", "price"])

    if not name:
        match = re.search(r"(?:yeni\s+)?(?:ürün|urun)\s+ekle\s+(.+)", message, flags=re.IGNORECASE)
        if match:
            tail = match.group(1).strip()
            name = tail.split(",")[0].strip()

    return {
        "name": name,
        "category": category or "Genel",
        "unit": unit,
        "description": description,
        "stock": stock,
        "price": price,
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


def _get_order_or_response(order_id: int | None, db: Session):
    if not order_id:
        return None, _staff_response(
            "Hangi sipariş üzerinde işlem yapacağımı anlayamadım. Örneğin: `sipariş #3 onayla`.",
            intent="staff_needs_order_id",
        )

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None, _staff_response(
            f"Sipariş #{order_id} bulunamadı.",
            intent="staff_order_not_found",
            warnings=[f"Sipariş #{order_id} bulunamadı."],
        )
    return order, None


def _approve_staff_order(order_id: int, db: Session):
    order, error_response = _get_order_or_response(order_id, db)
    if error_response:
        return error_response

    if order.status != models.OrderStatus.DRAFT:
        return _staff_response(
            f"Sipariş #{order.id} onaylanamadı. Sadece Taslak durumundaki siparişler onaylanabilir. Mevcut durum: {order.status.value}.",
            intent="staff_order_action",
            warnings=["Sipariş uygun durumda değil."],
        )
    if order.missing_info:
        return _staff_response(
            f"Sipariş #{order.id} onaylanamadı. Eksik bilgiler: {order.missing_info}.",
            intent="staff_order_action",
            warnings=[f"Eksik bilgiler: {order.missing_info}"],
        )
    if not order.items:
        return _staff_response(
            f"Sipariş #{order.id} içinde ürün kalemi yok.",
            intent="staff_order_action",
            warnings=["Sipariş kalemi bulunmuyor."],
        )

    try:
        for item in order.items:
            if item.quantity is None or item.quantity <= 0:
                raise ValueError("Sipariş kalemlerinde miktarı eksik veya geçersiz ürün var.")
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise ValueError(f"Sipariş kalemi için ürün bulunamadı: {item.product_id}")
            if product.stock < item.quantity:
                raise ValueError(f"'{product.name}' için yetersiz stok. Mevcut: {product.stock:g} {product.unit}, istenen: {item.quantity:g}.")
            product.stock -= item.quantity

        order.status = models.OrderStatus.APPROVED
        db.commit()
        db.refresh(order)
        return _staff_response(
            f"Sipariş #{order.id} onaylandı ve stoktan düşüldü.\n{_format_order_line(order)}",
            intent="staff_order_action",
        )
    except ValueError as exc:
        db.rollback()
        return _staff_response(str(exc), intent="staff_order_action", warnings=[str(exc)])


def _reject_staff_order(order_id: int, db: Session):
    order, error_response = _get_order_or_response(order_id, db)
    if error_response:
        return error_response

    if order.status == models.OrderStatus.APPROVED:
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product and item.quantity:
                product.stock += item.quantity

    order.status = models.OrderStatus.REJECTED
    db.commit()
    db.refresh(order)
    return _staff_response(
        f"Sipariş #{order.id} reddedildi. Onaylı siparişten dönüldüyse stok iade edildi.",
        intent="staff_order_action",
    )


def _delete_staff_order(order_id: int, db: Session):
    order, error_response = _get_order_or_response(order_id, db)
    if error_response:
        return error_response

    if order.status == models.OrderStatus.APPROVED:
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product and item.quantity:
                product.stock += item.quantity

    db.delete(order)
    db.commit()
    return _staff_response(
        f"Sipariş #{order_id} silindi. Onaylı siparişten silindiyse stok iade edildi.",
        intent="staff_order_action",
    )


def _staff_order_detail(order_id: int, db: Session):
    order, error_response = _get_order_or_response(order_id, db)
    if error_response:
        return error_response

    return _staff_response(
        "Sipariş detayı:\n"
        f"- Sipariş: #{order.id}\n"
        f"- Durum: {order.status.value}\n"
        f"- Müşteri: {order.customer_name or 'İsim yok'}\n"
        f"- Telefon: {order.phone or 'Yok'}\n"
        f"- Adres: {(order.city or 'Şehir yok')}, {order.address or 'Adres yok'}\n"
        f"- Eksik bilgi: {order.missing_info or 'Yok'}\n"
        f"- Ürünler: {_format_order_items(order)}\n"
        f"- Kargo: {order.shipping_status or 'Hazırlanıyor'}",
        intent="staff_order_detail",
    )


def _update_staff_shipping(order_id: int, status: str, db: Session):
    order, error_response = _get_order_or_response(order_id, db)
    if error_response:
        return error_response

    order.shipping_status = status
    order.shipping_updated_at = datetime.utcnow()
    if status == "Kargoya Verildi":
        order.status = models.OrderStatus.SHIPPED
    db.commit()
    db.refresh(order)
    return _staff_response(
        f"Sipariş #{order.id} kargo durumu `{status}` olarak güncellendi.",
        intent="staff_shipping_action",
    )


def _update_staff_product(message: str, db: Session):
    product = _find_staff_product(message, db)
    if not product:
        return _staff_response(
            "Hangi ürünü güncelleyeceğimi anlayamadım. Örneğin: `zeytinyağı stokunu 12 yap` veya `nar ekşisi fiyatını 140 yap`.",
            intent="staff_product_not_found",
            warnings=["Ürün bulunamadı."],
        )

    stock_value = _extract_decimal_after_keywords(message, ["stok"])
    price_value = _extract_decimal_after_keywords(message, ["fiyat", "price"])
    updates = []

    if stock_value is not None:
        product.stock = stock_value
        updates.append(f"stok {stock_value:g} {product.unit}")
    if price_value is not None:
        product.price = price_value
        updates.append(f"fiyat {price_value:g} TL")

    if not updates:
        return _staff_response(
            f"{product.name} bulundu ama neyi güncelleyeceğimi anlayamadım. Stok veya fiyat değeri belirtin.",
            intent="staff_product_action",
        )

    db.commit()
    db.refresh(product)
    return _staff_response(
        f"{product.name} güncellendi: {', '.join(updates)}.\nGüncel durum: {_format_product(product)}",
        intent="staff_product_action",
    )


def _create_staff_product(message: str, db: Session):
    payload = _extract_product_payload(message)
    missing = []
    if not payload["name"]:
        missing.append("ürün adı")
    if payload["stock"] is None:
        missing.append("stok")
    if payload["price"] is None:
        missing.append("fiyat")

    if missing:
        return _staff_response(
            "Ürün eklemek için eksik bilgi var: "
            + ", ".join(missing)
            + ". Örnek: `ürün ekle ürün adı: Lavanta Sabunu, kategori: Kozmetik, stok: 20, fiyat: 75, birim: adet`",
            intent="staff_product_action",
            warnings=[f"Eksik: {', '.join(missing)}"],
        )

    existing = db.query(models.Product).filter(models.Product.name == payload["name"]).first()
    if existing:
        return _staff_response(
            f"{payload['name']} zaten stok listesinde var. Güncellemek için `stokunu ... yap` veya `fiyatını ... yap` diyebilirsiniz.",
            intent="staff_product_action",
            warnings=["Aynı isimde ürün var."],
        )

    product = models.Product(
        name=payload["name"],
        category=payload["category"],
        unit=payload["unit"],
        description=payload["description"],
        stock=payload["stock"],
        price=payload["price"],
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _staff_response(
        f"Yeni ürün eklendi: {_format_product(product)}",
        intent="staff_product_action",
    )


def _staff_product_detail(message: str, db: Session):
    product = _find_staff_product(message, db)
    if not product:
        return _staff_response(
            "Hangi ürünü sorguladığınızı anlayamadım. Örneğin: `nar ekşisi stok ne` veya `zeytinyağı kaç para`.",
            intent="staff_product_not_found",
            warnings=["Ürün bulunamadı."],
        )

    return _staff_response(
        "Ürün durumu:\n"
        f"- {_format_product(product)}\n"
        f"- Kategori: {product.category}\n"
        f"- Açıklama: {product.description or 'Yok'}",
        intent="staff_product_detail",
    )


def _looks_like_customer_message(normalized: str):
    customer_markers = [
        "musteri mesaji", "musteri yazdi", "musteriden gelen",
        "almak istiyorum", "siparis vermek", "sipariş vermek", "istiyorum",
        "kargom", "iade", "bozuk", "kirik", "kırık", "gec geldi", "geç geldi",
        "telefonum", "adresim", "ben ayse", "ben ahmet", "merhaba ben",
    ]
    has_phone = bool(re.search(r"(?:\+?90\s*)?0?5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}", normalized))
    return has_phone or any(marker in normalized for marker in customer_markers)


def _strip_customer_message_prefix(message: str):
    match = re.search(
        r"(?:müşteri|musteri)\s*(?:mesajı|mesaji|yazdı|yazdi|dedi)?\s*[:=-]\s*(.+)",
        message,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else message


def process_staff_message(message: str, session_id: str | None, db: Session):
    normalized = normalize_text(message)

    if normalized.strip() in {"selam", "merhaba", "slm", "mrb", "hey", "hello"}:
        return _staff_response(
            "Merhaba, buradayım. Bana doğrudan operasyon komutu verebilirsiniz: `aktif siparişleri göster`, `kritik stokları göster`, `sipariş #3 onayla` gibi.",
            intent="staff_greeting",
        )

    if any(word in normalized for word in ["yardim", "komut", "ne yapabilirsin", "neler yapabilirsin"]):
        return _staff_response(
            "Ben panel içi Koopilot operasyon asistanıyım.\n\n"
            "Bana şunları sorabilirsiniz:\n"
            "- Aktif siparişleri göster\n"
            "- Taslak siparişleri listele\n"
            "- Kritik stokları göster\n"
            "- Kargodaki siparişler neler?\n"
            "- Bugünkü operasyon özeti\n\n"
            "İşlem de yapabilirim:\n"
            "- Sipariş #3 onayla\n"
            "- Sipariş #4 reddet\n"
            "- Sipariş #5 sil\n"
            "- Sipariş #2 kargoya verildi yap\n"
            "- Zeytinyağı stokunu 12 yap\n"
            "- Nar ekşisi fiyatını 140 yap\n"
            "- Ürün ekle ürün adı: Lavanta Sabunu, kategori: Kozmetik, stok: 20, fiyat: 75, birim: adet\n\n"
            "Ayrıca bir müşteri mesajını buraya yapıştırırsanız onu analiz edip sipariş taslağı, eksik bilgi listesi ve müşteriye cevap önerisi oluştururum.",
            intent="staff_help",
        )

    if "siparis" in normalized or "sipariş" in message.lower():
        order_id = _extract_first_number(normalized)
        if any(word in normalized for word in ["onayla", "onay", "approve"]):
            return _approve_staff_order(order_id, db)
        if any(word in normalized for word in ["reddet", "iptal", "reject"]):
            return _reject_staff_order(order_id, db)
        if any(word in normalized for word in ["sil", "kaldir", "kaldır", "delete"]):
            return _delete_staff_order(order_id, db)
        if any(word in normalized for word in ["teslim", "yolda", "verildi", "hazirlaniyor"]):
            if "teslim" in normalized:
                return _update_staff_shipping(order_id, "Teslim Edildi", db)
            if "yolda" in normalized:
                return _update_staff_shipping(order_id, "Yolda", db)
            if "verildi" in normalized:
                return _update_staff_shipping(order_id, "Kargoya Verildi", db)
            if "hazirlaniyor" in normalized:
                return _update_staff_shipping(order_id, "Hazırlanıyor", db)
        if order_id and any(word in normalized for word in ["detay", "durum", "ne", "goster", "göster", "bilgi"]):
            return _staff_order_detail(order_id, db)

    if "kargo" in normalized and any(word in normalized for word in ["yap", "guncelle", "verildi", "yolda", "teslim", "hazirlaniyor"]):
        order_id = _extract_first_number(normalized)
        if "teslim" in normalized:
            return _update_staff_shipping(order_id, "Teslim Edildi", db)
        if "yolda" in normalized:
            return _update_staff_shipping(order_id, "Yolda", db)
        if "verildi" in normalized:
            return _update_staff_shipping(order_id, "Kargoya Verildi", db)
        if "hazirlaniyor" in normalized:
            return _update_staff_shipping(order_id, "Hazırlanıyor", db)

    if any(word in normalized for word in ["urun ekle", "ürün ekle", "yeni urun", "yeni ürün"]):
        return _create_staff_product(message, db)

    if any(word in normalized for word in ["stokunu", "stogu", "stok", "fiyatini", "fiyati", "fiyat"]) and any(word in normalized for word in ["yap", "ayarla", "guncelle", "degistir", "değiştir"]):
        return _update_staff_product(message, db)

    if any(word in normalized for word in ["stok", "fiyat", "fiyati", "fiyatini", "para", "kac", "kaç"]) and _find_staff_product(message, db):
        return _staff_product_detail(message, db)

    if "stok" in normalized and any(word in normalized for word in ["kritik", "dusuk", "az", "biten", "tukenen", "uyari"]):
        low_stock_products = db.query(models.Product).filter(models.Product.stock < 10).order_by(models.Product.stock.asc()).all()
        if not low_stock_products:
            return _staff_response(
                "Kritik stok görünmüyor. 10 adedin altında ürün bulunmuyor.",
                intent="staff_stock_summary",
            )

        lines = [
            f"- {product.name}: {product.stock:g} {product.unit} kaldı"
            for product in low_stock_products[:10]
        ]
        return _staff_response(
            f"Kritik stokta {len(low_stock_products)} ürün var:\n" + "\n".join(lines),
            intent="staff_stock_summary",
        )

    if "stok" in normalized and any(word in normalized for word in ["goster", "liste", "durum", "ne"]):
        products = db.query(models.Product).order_by(models.Product.stock.asc()).limit(12).all()
        lines = [
            f"- {product.name}: {product.stock:g} {product.unit} | {product.price:g} TL"
            for product in products
        ]
        return _staff_response(
            "Stok durumu:\n" + "\n".join(lines),
            intent="staff_stock_summary",
        )

    if "siparis" in normalized and any(word in normalized for word in ["aktif", "goster", "liste", "neler", "var"]):
        active_orders = db.query(models.Order).filter(
            models.Order.status.in_([
                models.OrderStatus.DRAFT,
                models.OrderStatus.APPROVED,
                models.OrderStatus.SHIPPED,
            ])
        ).order_by(models.Order.order_date.desc()).limit(10).all()

        if not active_orders:
            return _staff_response(
                "Aktif sipariş bulunmuyor. Yeni Telegram veya panel siparişi geldiğinde burada özetleyebilirim.",
                intent="staff_orders_summary",
            )

        lines = [
            f"- #{order.id} | {order.status.value} | {order.customer_name or 'İsim yok'} | {_format_order_items(order)}"
            for order in active_orders
        ]
        return _staff_response(
            f"Aktif siparişler ({len(active_orders)} kayıt):\n" + "\n".join(lines),
            intent="staff_orders_summary",
        )

    if "taslak" in normalized and "siparis" in normalized:
        draft_orders = db.query(models.Order).filter(
            models.Order.status == models.OrderStatus.DRAFT
        ).order_by(models.Order.order_date.desc()).limit(10).all()

        if not draft_orders:
            return _staff_response("Taslak sipariş bulunmuyor.", intent="staff_orders_summary")

        lines = [
            f"- #{order.id} | {order.customer_name or 'İsim yok'} | Eksik: {order.missing_info or 'yok'} | {_format_order_items(order)}"
            for order in draft_orders
        ]
        return _staff_response(
            f"Taslak siparişler ({len(draft_orders)} kayıt):\n" + "\n".join(lines),
            intent="staff_orders_summary",
        )

    if "kargo" in normalized and any(word in normalized for word in ["goster", "liste", "aktif", "nerede", "durum"]):
        shipments = db.query(models.Order).filter(
            models.Order.status.in_([models.OrderStatus.APPROVED, models.OrderStatus.SHIPPED])
        ).order_by(models.Order.order_date.desc()).limit(10).all()

        if not shipments:
            return _staff_response("Aktif kargo/takip kaydı bulunmuyor.", intent="staff_shipping_summary")

        lines = [
            f"- #{order.id} | {order.customer_name or 'İsim yok'} | {order.shipping_status or 'Hazırlanıyor'}"
            for order in shipments
        ]
        return _staff_response(
            f"Kargo takibindeki siparişler:\n" + "\n".join(lines),
            intent="staff_shipping_summary",
        )

    if any(word in normalized for word in ["ozet", "bugun", "durum raporu", "operasyon"]):
        today = date.today()
        total_messages = db.query(models.MessageLog).filter(func.date(models.MessageLog.created_at) == today).count()
        draft_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.DRAFT).count()
        approved_count = db.query(models.Order).filter(models.Order.status == models.OrderStatus.APPROVED).count()
        low_stock_count = db.query(models.Product).filter(models.Product.stock < 10).count()

        return _staff_response(
            "Bugünkü operasyon özeti:\n"
            f"- Analiz edilen mesaj: {total_messages}\n"
            f"- Taslak sipariş: {draft_count}\n"
            f"- Onaylı sipariş: {approved_count}\n"
            f"- Kritik stok ürünü: {low_stock_count}",
            intent="staff_daily_summary",
        )

    if not _looks_like_customer_message(normalized):
        return _staff_response(
            "Bunu müşteri mesajı olarak işlemeyeceğim; panelde personelle konuşuyorum. Ne yapmamı istediğinizi operasyon komutu gibi yazın.\n\n"
            "Örnekler: `aktif siparişleri göster`, `kritik stokları göster`, `sipariş #3 onayla`, `zeytinyağı stokunu 12 yap`.",
            intent="staff_clarification",
        )

    customer_message = _strip_customer_message_prefix(message)
    customer_flow = process_message(customer_message, session_id, db)
    draft = customer_flow["ai_analysis"].get("ai_reply_draft") or "Cevap taslağı üretilemedi."
    customer_flow["ai_analysis"]["ai_reply_draft"] = (
        "Müşteri mesajını analiz ettim.\n\n"
        f"Müşteriye cevap taslağı:\n{draft}"
    )
    return customer_flow


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
def staff_assistant(request: schemas.MessageRequest, db: Session = Depends(get_db)):
    client_id = f"staff_{request.session_id or 'anonymous'}"
    check_rate_limit(client_id)

    try:
        return process_staff_message(request.message, request.session_id, db)
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
