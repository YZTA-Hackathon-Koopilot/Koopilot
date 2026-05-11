from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base
from db_init import init_db
import models
from routers import inventory, orders, shipping, ai, integrations, auth
import os

Base.metadata.create_all(bind=engine)
init_db()

app = FastAPI(
    title="Koopilot Backend API",
    description="KOBİ ve kooperatifler için AI destekli operasyon ajanı",
    version="1.1.0"
)

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://koopilot.vercel.app",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(shipping.router)
app.include_router(ai.router)
app.include_router(integrations.router)
app.include_router(auth.router)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Sunucu tarafında beklenmeyen bir hata oluştu.", 
            "error_msg": str(exc)
        }
    )

@app.get("/", tags=["Root"])
def read_root():
    return {
        "message": "Koopilot API'ye Hoş Geldiniz!",
        "docs": "/docs",
        "version": "1.1.0"
    }

@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok", "service": "koopilot-backend"}
