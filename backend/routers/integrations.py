import json
import os
from urllib import request as urlrequest
from urllib.error import URLError

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import get_db
from routers.ai import check_rate_limit, process_message

router = APIRouter(
    prefix="/integrations",
    tags=["Integrations"]
)


def call_json_api(url: str, payload: dict | None = None, method: str = "POST"):
    data = json.dumps(payload or {}).encode("utf-8") if payload is not None else None
    api_request = urlrequest.Request(
        url=url,
        data=data,
        headers={"Content-Type": "application/json"},
        method=method,
    )

    try:
        with urlrequest.urlopen(api_request, timeout=10) as response:
            response_body = response.read().decode("utf-8")
            return {
                "ok": True,
                "status_code": response.status,
                "body": json.loads(response_body) if response_body else {},
            }
    except URLError as exc:
        return {"ok": False, "reason": str(exc)}


def get_public_backend_url():
    load_dotenv(override=False)
    return (
        os.getenv("PUBLIC_BACKEND_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
        or "https://koopilot-backend.onrender.com"
    ).rstrip("/")


def get_telegram_config():
    load_dotenv(override=False)
    return {
        "token": os.getenv("TELEGRAM_BOT_TOKEN"),
        "secret": os.getenv("TELEGRAM_WEBHOOK_SECRET"),
        "public_backend_url": get_public_backend_url(),
    }


def get_telegram_api_url(method: str):
    token = get_telegram_config()["token"]
    if not token:
        return None
    return f"https://api.telegram.org/bot{token}/{method}"


def call_telegram_api(method: str, payload: dict | None = None, http_method: str = "POST"):
    api_url = get_telegram_api_url(method)
    if not api_url:
        return {"ok": False, "reason": "TELEGRAM_BOT_TOKEN tanımlı değil."}
    return call_json_api(api_url, payload=payload, method=http_method)


def get_telegram_webhook_url():
    return f"{get_public_backend_url()}/integrations/telegram/webhook"


def get_telegram_remote_status():
    config = get_telegram_config()
    if not config["token"]:
        return {
            "token_configured": False,
            "webhook_configured": False,
            "webhook_matches_expected": False,
            "secret_configured": bool(config["secret"]),
            "expected_webhook_url": get_telegram_webhook_url(),
            "bot": None,
            "webhook_info": None,
            "error": "TELEGRAM_BOT_TOKEN tanımlı değil.",
        }

    bot_result = call_telegram_api("getMe", http_method="GET")
    webhook_result = call_telegram_api("getWebhookInfo", http_method="GET")
    webhook_info = webhook_result.get("body", {}).get("result") if webhook_result.get("ok") else None
    current_url = (webhook_info or {}).get("url") or ""
    expected_url = get_telegram_webhook_url()

    return {
        "token_configured": True,
        "webhook_configured": bool(current_url),
        "webhook_matches_expected": current_url == expected_url,
        "secret_configured": bool(config["secret"]),
        "expected_webhook_url": expected_url,
        "bot": bot_result.get("body", {}).get("result") if bot_result.get("ok") else None,
        "webhook_info": webhook_info,
        "error": None if bot_result.get("ok") and webhook_result.get("ok") else bot_result.get("reason") or webhook_result.get("reason"),
    }


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
    telegram_status = get_telegram_remote_status()
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
            "live": bool(telegram_status["token_configured"] and telegram_status["webhook_configured"]),
            "mode": (
                "connected"
                if telegram_status["webhook_matches_expected"]
                else "token_present_webhook_missing"
                if telegram_status["token_configured"]
                else "token_missing"
            ),
            "label": (
                "Canlı bağlı"
                if telegram_status["webhook_matches_expected"]
                else "Webhook eksik"
                if telegram_status["token_configured"]
                else "Token tanımlı değil"
            ),
            "honest_note": (
                "Telegram botu gerçek mesaj kanalına bağlı. Kullanıcılar bota yazınca mesajlar Koopilot AI ajan hattına düşer."
                if telegram_status["webhook_matches_expected"]
                else "Telegram tokenı tanımlı ama webhook bu backend'e bağlı görünmüyor. Webhook kurulumu yapılmalı."
                if telegram_status["token_configured"]
                else "Telegram canlı kanal demosu için TELEGRAM_BOT_TOKEN tanımlanmalı."
            ),
            "webhook_url": "/integrations/telegram/webhook",
            "expected_webhook_url": telegram_status["expected_webhook_url"],
            "bot_username": (telegram_status.get("bot") or {}).get("username"),
            "pending_update_count": (telegram_status.get("webhook_info") or {}).get("pending_update_count"),
            "last_error_message": (telegram_status.get("webhook_info") or {}).get("last_error_message"),
            "required_env": ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "PUBLIC_BACKEND_URL"],
            "implemented": [
                "Webhook ile gerçek Telegram mesajı alma",
                "Gemini AI analiz hattına aktarma",
                "Kullanıcıya Telegram üzerinden cevap gönderme",
                "Webhook durum kontrolü ve tek komutla kurulum endpointi",
            ],
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
    result = call_telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": text[:4000],
    })
    return {
        "sent": bool(result.get("ok") and result.get("body", {}).get("ok")),
        "status_code": result.get("status_code"),
        "telegram_response": result.get("body"),
        "reason": result.get("reason"),
    }


def send_telegram_chat_action(chat_id: int, action: str = "typing"):
    return call_telegram_api("sendChatAction", {
        "chat_id": chat_id,
        "action": action,
    })


@router.get("/channels", summary="Mesaj kanallarının gerçek bağlantı durumunu listele")
def channels_status():
    return get_channel_statuses()


@router.get("/telegram/status", summary="Telegram bot ve webhook durumunu göster")
def telegram_status():
    return get_telegram_remote_status()


@router.post("/telegram/setup-webhook", summary="Telegram webhook'unu canlı backend'e bağla")
def setup_telegram_webhook(drop_pending_updates: bool = True):
    config = get_telegram_config()
    if not config["token"]:
        raise HTTPException(status_code=400, detail="TELEGRAM_BOT_TOKEN tanımlı değil.")

    payload = {
        "url": get_telegram_webhook_url(),
        "drop_pending_updates": drop_pending_updates,
        "allowed_updates": ["message", "edited_message"],
    }
    if config["secret"]:
        payload["secret_token"] = config["secret"]

    result = call_telegram_api("setWebhook", payload)
    if not result.get("ok") or not result.get("body", {}).get("ok"):
        raise HTTPException(status_code=502, detail=result)

    return {
        "status": "configured",
        "webhook_url": payload["url"],
        "secret_enabled": bool(config["secret"]),
        "telegram_response": result["body"],
    }


@router.post("/telegram/delete-webhook", summary="Telegram webhook'unu kaldır")
def delete_telegram_webhook(drop_pending_updates: bool = False):
    result = call_telegram_api("deleteWebhook", {
        "drop_pending_updates": drop_pending_updates,
    })
    if not result.get("ok") or not result.get("body", {}).get("ok"):
        raise HTTPException(status_code=502, detail=result)

    return {"status": "deleted", "telegram_response": result["body"]}


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
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    config = get_telegram_config()
    if config["secret"] and x_telegram_bot_api_secret_token != config["secret"]:
        raise HTTPException(status_code=403, detail="Telegram webhook secret doğrulanamadı.")

    update = await request.json()
    message = update.get("message") or update.get("edited_message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = message.get("text")

    if not chat_id or not text:
        return {"status": "ignored", "reason": "Metin mesajı bulunamadı."}

    if text.startswith("/start"):
        reply_text = (
            "Merhaba, ben Koopilot. Kooperatif siparişlerinizi analiz edip stok ve sipariş taslağı oluşturabilirim.\n\n"
            "Denemek için şöyle yazabilirsiniz:\n"
            "Merhaba, ben Ayşe Yılmaz. 05551234567. Ankara'ya 2 domates salçası ve 1 nar ekşisi istiyorum."
        )
        return {
            "status": "command_processed",
            "chat_id": chat_id,
            "telegram": send_telegram_message(chat_id, reply_text),
        }

    if text.startswith("/help") or text.startswith("/yardim"):
        reply_text = (
            "Koopilot'a doğal dille sipariş, kargo sorusu veya şikayet yazabilirsiniz.\n"
            "Örnek: 2 kavanoz domates salçası istiyorum, İstanbul'a kargo olur mu?"
        )
        return {
            "status": "command_processed",
            "chat_id": chat_id,
            "telegram": send_telegram_message(chat_id, reply_text),
        }

    session_id = f"telegram_{chat_id}"
    check_rate_limit(session_id)
    send_telegram_chat_action(chat_id)

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
