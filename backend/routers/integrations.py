import json
import os
from urllib import request as urlrequest
from urllib.error import URLError

from fastapi import APIRouter, Depends, HTTPException, Request
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import get_db
from routers.ai import check_rate_limit, process_message

router = APIRouter(
    prefix="/integrations",
    tags=["Integrations"]
)


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
