<p align="center">
  <img src="docs/branding/arkas%C4%B1%20beyaz%20yaz%C4%B1l%C4%B1%20logo.png" alt="Koopilot Banner" width="800"/>
</p>

<h1 align="center">🤖 Koopilot</h1>
<h3 align="center">Kadın Kooperatifleri için AI Destekli Sipariş, Stok ve Kargo Operasyon Ajanı</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Gemini_AI-3.1_Flash--Lite-4285F4?logo=google&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
</p>

<p align="center">
  <b>Web paneli ve mesaj kanallarından gelen müşteri mesajlarını siparişe dönüştürür,<br/>stok kontrol eder, kargo sorularını cevaplar ve yöneticiden onay alarak aksiyon üretir.</b>
</p>

---

## 📋 İçindekiler

- [Problem](#-problem)
- [Çözüm](#-çözüm)
- [Demo Senaryosu](#-demo-senaryosu)
- [Mimari](#️-mimari)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Yapay Zeka Kullanımı](#-yapay-zeka-kullanımı)
- [Kurulum](#-kurulum)
- [API Endpoints](#-api-endpoints)
- [Proje Yapısı](#-proje-yapısı)
- [Gelecek Geliştirmeler](#-gelecek-geliştirmeler)
- [Takım](#-takım)

---

## 🔴 Problem

Kadın kooperatifleri ve küçük e-ticaret yapan KOBİ'ler, sipariş yönetimini WhatsApp, Instagram DM, mail ve telefon üzerinden **manuel olarak** yürütüyor.

| Sorun | Etki |
|-------|------|
| Siparişler WhatsApp ve Telegram'dan alınıyor | Kayıp siparişler, unutulan detaylar |
| Stok takibi Excel/defter ile yapılıyor | Stokta olmayan ürün satışa sunuluyor |
| "Kargom nerede?" soruları tek tek yanıtlanıyor | Saatler süren manuel iş yükü |
| Hangi ürünün çok gittiği bilinmiyor | Üretim planlaması yapılamıyor |

> 6 Şubat depremi sonrası Hatay ve çevre illerdeki kadın kooperatifleri dijitalleşme desteğine ihtiyaç duyuyor. **Koopilot** bu boşluğu doldurmak için tasarlandı.

---

## 💡 Çözüm

**Koopilot**, kooperatiflerin günlük operasyonlarını yöneten bir **AI operasyon ajanıdır** — basit bir chatbot değil.

### Koopilot Ne Yapar?

```
Müşteri Mesajı → AI Analiz → Niyet Çıkarımı → Aksiyon Önerisi → İnsan Onayı → Operasyon
```

| Özellik | Açıklama |
|---------|----------|
| 📩 **Mesaj Analizi** | Serbest Türkçe müşteri mesajından niyet çıkarımı (sipariş, kargo, şikayet, soru) |
| 🛒 **Otomatik Sipariş Taslağı** | Mesajdan ürün adı, adet, müşteri bilgilerini çıkarıp sipariş taslağı oluşturma |
| 📦 **Stok Kontrolü** | Sipariş öncesi stok doğrulama ve alternatif ürün önerisi |
| 🚚 **Kargo Sorgulama** | Müşterinin kargo durumunu sorgulayıp yanıt önerisi üretme |
| ✅ **Human-in-the-Loop** | AI taslak oluşturur, **insan onaylar** — tam otomatik değil, güvenli |
| 📊 **Günlük Özet** | Gün sonu: kaç sipariş, hangi ürünler çok soruldu, stok uyarıları |
| ⚠️ **Stok Uyarıları** | Çok talep edilen ama stokta olmayan ürünler için otomatik uyarı |

---

## 🎬 Demo Senaryosu

### Senaryo: Müşteri mesajından sipariş taslağı oluşuyor

**1. Mesaj Gelir:**
> "Merhaba, 2 kavanoz domates salçası ve 1 nar ekşisi almak istiyorum. Ankara'ya kargo olur mu?"

**2. AI Analiz Eder:**
```json
{
  "intent": "new_order",
  "products": [
    {"name": "domates salçası", "quantity": 2},
    {"name": "nar ekşisi", "quantity": 1}
  ],
  "city": "Ankara",
  "missing_info": ["customer_name", "phone", "address"]
}
```

**3. Stok Kontrol Edilir:**
- ✅ Domates Salçası: 50 adet mevcut
- ✅ Nar Ekşisi: 30 adet mevcut

**4. AI Cevap Önerisi Üretir:**
> "Merhaba! Domates salçamız ve nar ekşimiz stokta mevcut. Siparişinizi tamamlamak için ad-soyad, telefon ve açık adresinizi paylaşır mısınız? 🌿"

**5. Kooperatif Yöneticisi Dashboard'dan Onaylar → Sipariş Kesinleşir**

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    KOOPILOT MİMARİSİ                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  WhatsApp    │    │   Telegram   │    │ Web Panel │  │
│  │  Adapter     │    │   Bot API    │    │ Test Akışı│  │
│  └──────┬───────┘    └──────┬───────┘    └─────┬─────┘  │
│         │                   │                  │        │
│         └───────────────────┼──────────────────┘        │
│                             │                           │
│                    ┌────────▼────────┐                   │
│                    │  Message Inbox  │                   │
│                    │   (Adapter)     │                   │
│                    └────────┬────────┘                   │
│                             │                           │
│          ┌──────────────────▼──────────────────┐        │
│          │         FastAPI Backend              │        │
│          │  ┌─────────────────────────────┐     │        │
│          │  │    Gemini AI Agent          │     │        │
│          │  │  • Intent Extraction        │     │        │
│          │  │  • Product Matching         │     │        │
│          │  │  • Reply Generation         │     │        │
│          │  │  • Function Calling         │     │        │
│          │  └─────────────────────────────┘     │        │
│          │  ┌──────────┐  ┌───────────────┐    │        │
│          │  │ Order    │  │ Inventory     │    │        │
│          │  │ Service  │  │ Service       │    │        │
│          │  └──────────┘  └───────────────┘    │        │
│          │  ┌──────────┐  ┌───────────────┐    │        │
│          │  │ Shipping │  │ Analytics     │    │        │
│          │  │ Mock API │  │ Service       │    │        │
│          │  └──────────┘  └───────────────┘    │        │
│          └──────────────────┬──────────────────┘        │
│                             │                           │
│                    ┌────────▼────────┐                   │
│                    │   SQLite DB     │                   │
│                    └─────────────────┘                   │
│                             │                           │
│          ┌──────────────────▼──────────────────┐        │
│          │      React Dashboard (Vite)         │        │
│          │  ┌─────────┐ ┌──────┐ ┌──────────┐  │        │
│          │  │ Mesajlar │ │Stok  │ │Siparişler│  │        │
│          │  └─────────┘ └──────┘ └──────────┘  │        │
│          │  ┌─────────┐ ┌──────────────────┐   │        │
│          │  │ Kargo   │ │  Günlük Özet     │   │        │
│          │  └─────────┘ └──────────────────┘   │        │
│          └─────────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> **Dürüst entegrasyon notu:** Web panelindeki mesaj akışı canlı çalışır. Telegram Bot API opsiyonel gerçek kanal olarak desteklenir. WhatsApp Business API için backend webhook doğrulama, mesaj işleme ve cevap gönderme adaptörü hazırlanmıştır; ancak canlı WhatsApp hesabı/tokenları tanımlı değilse ürün gerçek WhatsApp mesajı alıp göndermez. Demo sırasında bu durum UI'daki **Kanallar** sayfasında açıkça gösterilir.

---

## 🛠 Teknoloji Yığını

| Katman | Teknoloji | Neden? |
|--------|-----------|--------|
| **Backend** | FastAPI + Python 3.11+ | Hackathon gereksinimi, hızlı API geliştirme, otomatik `/docs` |
| **AI** | Google Gemini 3.1 Flash-Lite | Düşük gecikmeli, düşük maliyetli, yapılandırılmış çıktı ve hafif ajan görevleri için uygun |
| **Veritabanı** | SQLite + SQLAlchemy ORM | Sıfır konfigürasyon, taşınabilir, hackathon için ideal |
| **Frontend** | React 18 + Vite | Hızlı geliştirme, modern araçlar, component tabanlı UI |
| **Stil** | CSS (Modern) | Temiz, hızlı, bağımlılık gerektirmeyen |

---

## 🧠 Yapay Zeka Kullanımı

Koopilot'ta AI sadece "sohbet etmek" için kullanılmıyor. **İş yapan bir ajan** olarak çalışıyor:

| AI Fonksiyonu | Açıklama |
|---------------|----------|
| **Niyet Çıkarımı** | Serbest Türkçe mesajdan intent belirleme (sipariş, kargo, şikayet, soru) |
| **Ürün Eşleştirme** | "ev yapımı salça", "domates salçası", "acı salça" → katalogdaki doğru ürün |
| **Bilgi Çıkarımı** | Mesajdan ad, telefon, adres, şehir, ürün ve adet çıkarma |
| **Eksik Bilgi Tespiti** | Sipariş için gerekli ama mesajda olmayan bilgileri listeleme |
| **Cevap Üretimi** | Stok durumuna göre kişiselleştirilmiş, profesyonel cevap önerisi |
| **Mesaj Önceliklendirme** | Şikayet > Sipariş > Kargo sorusu > Genel soru |
| **Günlük Özet** | "Bugün 18 mesaj, 7 sipariş, 3 stok yetersizliği, en çok sorulan: nar ekşisi" |
| **Sohbet Hafızası** | Önceki mesajları bağlam olarak kullanarak tutarlı diyalog |

### Gemini Structured Output

Gemini'nin `response_schema` özelliği kullanılarak her yanıt **yapılandırılmış JSON** olarak alınır. Bu sayede AI çıktısı doğrudan iş mantığına aktarılır:

```python
config={
    'response_mime_type': 'application/json',
    'response_schema': AIFinalResponse,  # Pydantic model
    'temperature': 0.1  # Düşük sıcaklık = tutarlı çıktı
}
```

---

## 🚀 Kurulum

### Gereksinimler

- Python 3.11 veya 3.12 önerilir
- Node.js 18+
- Gemini API Key ([Google AI Studio](https://aistudio.google.com/)'dan ücretsiz alınabilir)
- Opsiyonel Telegram Bot Token (BotFather üzerinden alınabilir)

### Backend

```bash
# 1. Repo'yu klonla
git clone https://github.com/YZTA-Hackathon-Koopilot/Koopilot.git
cd YZTA-Hackathon-Koopilot

# 2. Backend sanal ortam oluştur
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Bağımlılıkları yükle
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. API anahtarını ayarla
cp .env.example .env
# .env dosyasını aç ve GEMINI_API_KEY değerini gir
# Telegram gerçek kanal demosu için TELEGRAM_BOT_TOKEN değerini de ekleyebilirsin
# Telegram webhook güvenliği için TELEGRAM_WEBHOOK_SECRET değerini rastgele bir metin olarak belirle
# WhatsApp altyapısı için WHATSAPP_* değerleri .env.example içinde yer alır; token yoksa canlı WhatsApp bağlı değildir

# 5. Veritabanını başlat (demo verileriyle)
python db_init.py

# 6. Sunucuyu başlat
python -m uvicorn main:app --reload --port 8000
```

Backend çalıştıktan sonra: **http://localhost:8000/docs** adresinden etkileşimli API dokümantasyonuna erişebilirsiniz.

### Frontend

```bash
# Ayrı bir terminal aç
cd frontend

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Frontend: **http://localhost:5173** adresinde çalışacaktır.

---

## 🌐 Canlı Demo Deploy

Hackathon demosu için önerilen canlı mimari:

- Backend: Render Free Web Service
- Frontend: Vercel, Netlify veya Render Static Site
- Mesaj kanalı: Web panel test akışı + opsiyonel Telegram Bot API + WhatsApp webhook altyapısı

Backend için repo kökünde `render.yaml` bulunur. Render blueprint veya manuel kurulumda temel ayarlar:

```text
Root Directory: backend
Build Command: python -m pip install --upgrade pip && python -m pip install -r requirements.txt
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

Canlı backend kontrolü:

```text
https://koopilot-backend.onrender.com/health
https://koopilot-backend.onrender.com/docs
```

Frontend deploy ortam değişkeni:

```env
VITE_API_URL=https://koopilot-backend.onrender.com
```

Vercel frontend ayarları:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Telegram webhook kurulumu:

```bash
curl -X POST "https://koopilot-backend.onrender.com/integrations/telegram/setup-webhook?drop_pending_updates=true"
```

Detaylı canlı demo planı için: [`docs/canli-demo-plani.md`](docs/canli-demo-plani.md)

---

## 📡 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/health` | Canlı servis sağlık kontrolü |
| `POST` | `/ai/analyze-message` | Müşteri mesajını AI ile analiz et, niyet çıkar, aksiyon öner |
| `POST` | `/integrations/telegram/webhook` | Telegram mesajlarını Koopilot AI ajanına aktar |
| `GET` | `/integrations/telegram/status` | Telegram bot ve webhook durumunu göster |
| `POST` | `/integrations/telegram/setup-webhook` | Telegram webhook'unu canlı backend'e bağla |
| `POST` | `/integrations/telegram/delete-webhook` | Telegram webhook'unu kaldır |
| `GET` | `/integrations/channels` | Mesaj kanallarının gerçek bağlantı durumunu listele |
| `GET` | `/integrations/whatsapp/status` | WhatsApp entegrasyon durumunu göster |
| `GET` | `/integrations/whatsapp/webhook` | WhatsApp Business webhook doğrulaması |
| `POST` | `/integrations/whatsapp/webhook` | WhatsApp payload'ını Koopilot AI ajanına aktar |
| `GET` | `/inventory` | Tüm ürünleri ve stok durumlarını listele |
| `PUT` | `/inventory/{product_id}` | Ürün stok güncelle |
| `POST` | `/inventory/upload` | Excel/CSV ile toplu ürün yükle |
| `GET` | `/orders` | Tüm siparişleri listele |
| `PUT` | `/orders/{order_id}/approve` | Siparişi onayla ve stoktan düş |
| `GET` | `/shipping/status/{order_id}` | Mock kargo durumu sorgula |
| `GET` | `/ai/daily-summary` | Günlük AI özet raporu |

> 💡 Tüm endpoint'lerin detaylı dokümantasyonu çalışır haldeyken `/docs` adresinden erişilebilir (FastAPI Swagger UI).

---

## 📁 Proje Yapısı

```
YZTA-Hackathon-Koopilot/
├── backend/
│   ├── main.py              # FastAPI uygulama giriş noktası ve route'lar
│   ├── ai_agent.py          # Gemini AI entegrasyonu ve mesaj analiz
│   ├── models.py            # SQLAlchemy veritabanı modelleri
│   ├── schemas.py           # Pydantic request/response şemaları
│   ├── database.py          # Veritabanı bağlantı konfigürasyonu
│   ├── db_init.py           # Demo verilerle veritabanı başlatma
│   ├── requirements.txt     # Python bağımlılıkları
│   ├── .env.example         # Ortam değişkenleri şablonu
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx          # Ana uygulama bileşeni
│   │   ├── main.jsx         # React giriş noktası
│   │   ├── index.css        # Global stiller ve tasarım sistemi
│   │   ├── components/      # UI bileşenleri
│   │   │   ├── Sidebar.jsx
│   │   │   ├── MessagePanel.jsx
│   │   │   ├── OrderPanel.jsx
│   │   │   ├── InventoryPanel.jsx
│   │   │   ├── ShippingPanel.jsx
│   │   │   └── DailySummary.jsx
│   │   └── services/
│   │       └── api.js       # Backend API iletişim katmanı
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── assets/              # Logo, banner, screenshot'lar
│   ├── gorev-muhammed.md    # Muhammed görev planı
│   ├── gorev-kaan.md        # Kaan görev planı
│   └── gorev-zeynep.md      # Zeynep görev planı
├── .gitignore
└── README.md
```

---

## 🔮 Gelecek Geliştirmeler

| Öncelik | Geliştirme | Açıklama |
|---------|-----------|----------|
| 🟡 | WhatsApp Business API | Backend adaptörü hazır; canlı bağlantı için Meta token/telefon kurulumu gerekir |
| 🟢 | Telegram Bot API | Webhook altyapısı hazır; BotFather tokenı tanımlanınca gerçek kanal demosu çalışır |
| 🟡 | Gerçek Kargo API | Aras, Yurtiçi, MNG kargo entegrasyonu |
| 🟡 | Talep Tahmini | Geçmiş siparişlere dayalı ürün talep öngörüsü |
| 🟢 | Çoklu Kooperatif Desteği | Birden fazla kooperatifin tek panelden yönetimi |
| 🟢 | Mobil Uygulama | React Native ile mobil dashboard |

---

## 👥 Takım

| Üye | Rol | Sorumluluk |
|-----|-----|------------|
| **Muhammed Köseoğlu** | Backend & AI | FastAPI, Gemini entegrasyonu, AI ajan geliştirme |
| **Kaan** | Frontend & UI/UX | React dashboard, kullanıcı deneyimi |
| **Zeynep** | Demo, Test & Sunum | Video, pitch deck, test, dokümantasyon |

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.

---

<p align="center">
  <b>Koopilot</b> — Kooperatiflerin dijital ekip arkadaşı 🌿<br/>
  <i>YZTA Hackathon 2026 | Google Yapay Zeka Teknoloji Akademisi</i>
</p>
