# Koopilot Canlı Demo Planı

## Amaç

Hackathon tesliminde jüriye sadece video değil, çalışan bir web deneyimi de sunmak. Bu canlı demo gerçek üretim ürünü olmayacak; hedef, Koopilot'un uçtan uca çalışan ürün fikrini güvenilir ve hızlı göstermek.

## Önerilen Mimari

| Parça | Platform | Neden |
|---|---|---|
| Backend | Render Free Web Service | FastAPI için hızlı deploy, ücretsiz başlangıç, `/docs` gösterilebilir |
| Frontend | Vercel veya Netlify | Vite/React için hızlı static deploy |
| AI | Gemini 3.1 Flash-Lite | Düşük gecikmeli, yapılandırılmış çıktı ve hafif ajan görevleri için uygun |
| Mesaj Kanalı | Mock WhatsApp + opsiyonel Telegram | WhatsApp maliyet/kurulum riskini azaltır, Telegram gerçek kanal demosu sağlar |

## Neden WhatsApp Gerçek API Değil?

WhatsApp Business Platform gerçek entegrasyon için işletme/numara kurulumu, token, webhook ve mesajlaşma kuralları gerektirir. Hackathon süresinde bu alan yüksek riskli. Ürün içinde WhatsApp akışı mock adapter olarak gösterilmeli; README ve sunumda aynı mimarinin WhatsApp Business API'ye bağlanabileceği anlatılmalı.

## Neden Telegram?

Telegram Bot API hızlı ve ücretsiz gerçek kanal demosu için uygundur. BotFather ile bot açılır, webhook backend'e bağlanır, gelen mesaj Koopilot'un mevcut AI analiz hattına düşer.

## Render Backend Kurulumu

Render'da blueprint kullanılacaksa repo kökündeki `render.yaml` yeterlidir.

Manuel kurulum için:

```text
Service type: Web Service
Root Directory: backend
Build Command: python -m pip install --upgrade pip && python -m pip install -r requirements.txt
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

Environment variables:

```env
GEMINI_API_KEY=...
TELEGRAM_BOT_TOKEN=...
```

Canlı backend kontrol adresleri:

```text
https://<render-service>.onrender.com/health
https://<render-service>.onrender.com/docs
```

## Frontend Deploy

Önerilen yol Vercel. Repo içinde `frontend/vercel.json` bulunur; bu dosya Vite uygulamasının sayfa yenilemede `index.html` üzerinden çalışmasını sağlar.

### Vercel Kurulumu

1. https://vercel.com adresine GitHub hesabıyla giriş yap.
2. Dashboard'da **Add New...** veya **New Project** seç.
3. `YZTA-Hackathon-Koopilot/Koopilot` reposunu seç.
4. Vercel repo içinde `frontend` ve `backend` gördüğü için "multiple services" veya `experimentalServices` önerirse bunu kullanma. Backend Render'da çalışıyor; Vercel projesi sadece frontend için açılacak.
5. Import ekranında ayarları şu şekilde yap:

```text
Project Name: koopilot
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

6. **Environment Variables** bölümüne şunu ekle:

```env
VITE_API_URL=https://koopilot-backend.onrender.com
```

7. Environment seçimi sorarsa **Production**, **Preview** ve **Development** hepsini seç.
8. **Deploy** butonuna bas.
9. Deploy bitince Vercel'in verdiği frontend URL'ini aç.

Canlı frontend açıldığında tarayıcı geliştirici konsolunda API isteklerinin şu backend'e gittiği kontrol edilmeli:

```text
https://koopilot-backend.onrender.com
```

### Netlify Alternatifi

Netlify kullanılacaksa:

```text
Root Directory: frontend
Build Command: npm install && npm run build
Output Directory: dist
```

Environment variable yine aynı:

```env
VITE_API_URL=https://koopilot-backend.onrender.com
```

Netlify için SPA refresh desteği gerekiyorsa `frontend/public/_redirects` dosyası eklenebilir:

```text
/* /index.html 200
```

## Telegram Webhook Kurulumu

1. BotFather üzerinden bot oluştur.
2. Bot token'ı Render'da `TELEGRAM_BOT_TOKEN` olarak ekle.
3. Backend deploy olduktan sonra webhook'u kur:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<render-service>.onrender.com/integrations/telegram/webhook"
```

4. Telegram botuna demo mesajı at:

```text
Merhaba, ben Ayşe Yılmaz. 05551234567.
Ankara Çankaya Atatürk Mah. No 12.
2 kavanoz ev yapımı salça ve 1 nar ekşisi almak istiyorum.
```

Beklenen sonuç:

- Bot cevap döner.
- Backend'de mesaj loglanır.
- Sipariş taslağı panelde görünür.

## Demo Sırasında Dikkat

- Render free servis uykuya geçebilir; demo başlamadan 2-3 dakika önce `/health` ve `/docs` açılarak uyandırılmalı.
- Telegram token yoksa webhook yine analiz sonucunu JSON döner ama Telegram'a cevap göndermez.
- WhatsApp gerçek API yerine UI'daki mock mesaj akışı gösterilmeli.
- Canlı demo patlarsa video ve lokal çalışan demo yedek plan olarak hazır olmalı.

## Kazandıran Anlatım

> Koopilot bugün web panelinden ve Telegram gibi gerçek mesaj kanallarından gelen müşteri mesajlarını aynı AI ajan hattına alabiliyor. WhatsApp entegrasyonu hackathon süresi için mock adapter olarak gösterildi; mimari aynı webhook yapısıyla WhatsApp Business API'ye bağlanabilir.
