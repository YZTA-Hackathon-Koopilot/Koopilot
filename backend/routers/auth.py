from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import (
    AuthLoginRequest,
    AuthProfileUpdateRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    AuthUserResponse,
    PasswordChangeRequest,
)
from security import generate_token, hash_password, normalize_email, verify_password


router = APIRouter(prefix="/auth", tags=["Auth"])
SESSION_EXPIRE_DAYS = 7
DEMO_EMAIL = "demo@koopilot.local"
DEMO_PASSWORD = "demo123"


def serialize_user(user: models.User) -> AuthUserResponse:
    return AuthUserResponse.model_validate(user)


def create_session(db: Session, user: models.User) -> AuthTokenResponse:
    session = models.AuthSession(
        token=generate_token(),
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return AuthTokenResponse(access_token=session.token, user=serialize_user(user))


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum bilgisi bulunamadı.",
        )

    token = authorization.split(" ", 1)[1].strip()
    session = (
        db.query(models.AuthSession)
        .filter(models.AuthSession.token == token)
        .first()
    )
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum süresi doldu. Lütfen tekrar giriş yapın.",
        )
    return session.user


def get_or_create_demo_user(db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
    if user:
        return user

    user = models.User(
        name="Demo Kullanıcı",
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        role="Yönetici",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=AuthTokenResponse)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi zaten kayıtlı.",
        )

    user = models.User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="Personel",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return create_session(db, user)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı.",
        )
    return create_session(db, user)


@router.post("/demo-login", response_model=AuthTokenResponse)
def demo_login(db: Session = Depends(get_db)):
    user = get_or_create_demo_user(db)
    return create_session(db, user)


@router.get("/me", response_model=AuthUserResponse)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=AuthUserResponse)
def update_profile(
    payload: AuthProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ad soyad en az 2 karakter olmalıdır.",
        )

    email = normalize_email(payload.email)
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi başka bir hesapta kullanılıyor.",
        )

    current_user.name = name
    current_user.email = email
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=AuthUserResponse)
def change_password(
    payload: PasswordChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifrenizi yanlış girdiniz.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        session = db.query(models.AuthSession).filter(models.AuthSession.token == token).first()
        if session:
            db.delete(session)
            db.commit()
    return {"status": "ok"}
