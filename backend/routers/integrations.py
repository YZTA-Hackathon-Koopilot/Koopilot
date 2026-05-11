import json
import os
from urllib import request as urlrequest
from urllib.error import URLError

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import get_db
from routers.ai import check_rate_limit, process_message

router = APIRouter(
    prefix="/integrations",
    tags=["Integrations"]
)


def get_whatsapp_config():
    load_dotenv(override=False)
    return {
        "access_token": os.getenv("WHATSAPP_ACCESS_TOKEN"),
        "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID"),
        "verify_token": os.getenv("WHATSAPP_VERIFY_TOKEN"),
        "api_version": os.getenv("WHATSAPP_API_VERSION", "v20.0"),
    }


def get_channel_statuses():
    whatsapp_config = get_whatsapp_config()
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    whatsapp_ready = bool(
        whatsapp_config["access_token"]
        and whatsapp_config["phone_number_id"]
        and whatsapp_config["verify_token"]
    )

    return {
        "whatsapp": {
            "name": "WhatsApp Business API",
            "live": whatsapp_ready,
            "mode": "ready_for_live_webhook" if whatsapp_ready else "not_connected",
            "label": "Canlı bağlantı hazır" if whatsapp_ready else "Canlı bağlantı yok",
            "honest_note": (
                "WhatsApp Business API tokenları tanımlı. Webhook gerçek mesajları aynı AI ajan hattına aktarabilir."
                if whatsapp_ready
                else "Şu anda gerçek WhatsApp hesabı bağlı değil. Web panelindeki mesaj akışı test/simülasyon amaçlıdır; canlı WhatsApp mesajı alıp göndermez."
            ),
            "webhook_url": "/integrations/whatsapp/webhook",
            "required_env": [
                "WHATSAPP_ACCESS_TOKEN",
                "WHATSAPP_PHONE_NUMBER_ID",
                "WHATSAPP_VERIFY_TOKEN",
            ],
            "implemented": [
                "Webhook doğrulama endpointi",
                "Gelen mesajı AI analiz hattına aktarma",
                "Token varsa cevap gönderme adaptörü",
            ],
        },
        "telegram": {
            "name": "Telegram Bot API",
            "live": bool(telegram_token),
            "mode": "connected_or_token_present" if telegram_token else "token_missing",
            "label": "Token tanımlı" if telegram_token else "Token tanımlı değil",
            "honest_note": (
                "Telegram tokenı tanımlıysa bot mesajları gerçek kanaldan alıp cevaplayabilir."
                if telegram_token
                else "Telegram canlı kanal demosu için TELEGRAM_BOT_TOKEN tanımlanmalı."
            ),
            "webhook_url": "/integrations/telegram/webhook",
        },
        "web_panel": {
            "name": "Web Panel Test Akışı",
            "live": True,
            "mode": "demo_input",
            "label": "Çalışıyor",
            "honest_note": "Mesajlar web panelinden manuel girilir; AI analiz, sipariş taslağı ve stok kontrolü gerçek backend üzerinde çalışır.",
            "endpoint": "/ai/analyze-message",
        },
    }


def extract_whatsapp_text(payload: dict):
    if payload.get("text"):
        return {
            "text": payload.get("text"),
            "from_number": payload.get("from") or payload.get("phone") or "manual_test",
            "message_id": payload.get("message_id") or "manual_test",
        }

    try:
        message = payload["entry"][0]["changes"][0]["value"]["messages"][0]
        return {
            "text": message.get("text", {}).get("body"),
            "from_number": message.get("from"),
            "message_id": message.get("id"),
        }
    except (KeyError, IndexError, TypeError):
        return {"text": None, "from_number": None, "message_id": None}


def send_whatsapp_message(to_number: str, text: str):
    config = get_whatsapp_config()
    if not config["access_token"] or not config["phone_number_id"]:
        return {
            "sent": False,
            "reason": "WhatsApp canlı gönderim aktif değil. WHATSAPP_ACCESS_TOKEN ve WHATSAPP_PHONE_NUMBER_ID tanımlı değil.",
        }

    payload = json.dumps({
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": text[:3900]},
    }).encode("utf-8")

    whatsapp_request = urlrequest.Request(
        url=f"https://graph.facebook.com/{config['api_version']}/{config['phone_number_id']}/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['access_token']}",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(whatsapp_request, timeout=10) as response:
            return {"sent": True, "status_code": response.status}
    except URLError as exc:
        return {"sent": False, "reason": str(exc)}


def send_telegram_message(chat_id: int, text: str):
    load_dotenv(override=False)
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        return {"sent": False, "reason": "TELEGRAM_BOT_TOKEN tanımlı değil."}

    payload = json.dumps({
        "chat_id": chat_id,
        "text": text[:3900]
    }).encode("utf-8")

    telegram_request = urlrequest.Request(
        url=f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urlrequest.urlopen(telegram_request, timeout=10) as response:
            return {"sent": True, "status_code": response.status}
    except URLError as exc:
        return {"sent": False, "reason": str(exc)}


@router.get("/channels", summary="Mesaj kanallarının gerçek bağlantı durumunu listele")
def channels_status():
    return get_channel_statuses()


@router.get("/whatsapp/status", summary="WhatsApp entegrasyon durumunu göster")
def whatsapp_status():
    return get_channel_statuses()["whatsapp"]


@router.get("/whatsapp/webhook", summary="WhatsApp Business webhook doğrulama endpointi")
def verify_whatsapp_webhook(
    mode: str | None = Query(default=None, alias="hub.mode"),
    token: str | None = Query(default=None, alias="hub.verify_token"),
    challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    config = get_whatsapp_config()
    if mode == "subscribe" and config["verify_token"] and token == config["verify_token"]:
        return PlainTextResponse(challenge or "")

    raise HTTPException(
        status_code=403,
        detail="WhatsApp webhook doğrulaması yapılamadı. WHATSAPP_VERIFY_TOKEN tanımlı olmalı ve Meta panelindeki token ile aynı olmalı.",
    )


@router.post("/whatsapp/webhook", summary="WhatsApp mesajlarını Koopilot AI ajanına aktar")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    extracted = extract_whatsapp_text(payload)
    text = extracted["text"]
    from_number = extracted["from_number"]

    if not text:
        return {
            "status": "ignored",
            "integration_status": get_channel_statuses()["whatsapp"],
            "reason": "Metin mesajı bulunamadı. Endpoint altyapısı hazır, ancak bu payload işlenebilir bir WhatsApp metin mesajı içermiyor.",
        }

    session_id = f"whatsapp_{from_number or 'manual_test'}"
    check_rate_limit(session_id)

    try:
        result = process_message(text, session_id, db)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"WhatsApp mesajı işlenemedi: {str(exc)}")

    reply_text = result["ai_analysis"]["ai_reply_draft"]
    if result.get("warnings"):
        reply_text += "\n\nUyarılar: " + " ".join(result["warnings"])

    outbound = send_whatsapp_message(from_number, reply_text) if from_number else {
        "sent": False,
        "reason": "Gönderim için alıcı WhatsApp numarası bulunamadı.",
    }

    return {
        "status": "processed",
        "integration_status": get_channel_statuses()["whatsapp"],
        "honest_note": "Bu endpoint gerçek WhatsApp webhook altyapısıdır. Ancak canlı mesaj gönderme/alma sadece Meta WhatsApp Business tokenları tanımlandığında aktif olur.",
        "from": from_number,
        "outbound": outbound,
        "result": result,
    }


@router.post("/telegram/webhook", summary="Telegram mesajlarını Koopilot AI ajanına aktar")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update = await request.json()
    message = update.get("message") or update.get("edited_message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = message.get("text")

    if not chat_id or not text:
        return {"status": "ignored", "reason": "Metin mesajı bulunamadı."}

    session_id = f"telegram_{chat_id}"
    check_rate_limit(session_id)

    try:
        result = process_message(text, session_id, db)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Telegram mesajı işlenemedi: {str(exc)}")

    reply_text = result["ai_analysis"]["ai_reply_draft"]
    if result.get("warnings"):
        reply_text += "\n\nUyarılar: " + " ".join(result["warnings"])

    telegram_result = send_telegram_message(chat_id, reply_text)

    return {
        "status": "processed",
        "chat_id": chat_id,
        "telegram": telegram_result,
        "result": result
    }
