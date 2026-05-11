# Koopilot Canlı Demo Planı

## Amaç

Hackathon tesliminde jüriye sadece video değil, çalışan bir web deneyimi de sunmak. Bu canlı demo gerçek üretim ürünü olmayacak; hedef, Koopilot'un uçtan uca çalışan ürün fikrini güvenilir ve hızlı göstermek.

## Önerilen Mimari

| Parça | Platform | Neden |
|---|---|---|
| Backend | Render Free Web Service | FastAPI için hızlı deploy, ücretsiz başlangıç, `/docs` gösterilebilir |
| Frontend | Vercel veya Netlify | Vite/React için hızlı static deploy |
| AI | Gemini 3.1 Flash-Lite | Düşük gecikmeli, yapılandırılmış çıktı ve hafif ajan görevleri için uygun |
| Mesaj Kanalı | Web panel test akışı + opsiyonel Telegram + WhatsApp adapter altyapısı | Olmayan canlı WhatsApp bağlantısını var gibi göstermeden, aynı AI ajan akışını güvenilir biçimde demo eder |

## Neden WhatsApp Gerçek API Değil?

WhatsApp Business Platform gerçek entegrasyon için işletme/numara kurulumu, token, webhook ve mesajlaşma kuralları gerektirir. Hackathon süresinde bu alan yüksek riskli. Bu yüzden ürün içinde WhatsApp canlı bağlıymış gibi gösterilmeyecek. Bunun yerine backend'de gerçek entegrasyona hazır webhook/adaptör altyapısı bulunacak, UI'da da “WhatsApp canlı bağlantı yok; web panelinden test ediliyor” bilgisi açıkça gösterilecek.

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
TELEGRAM_WEBHOOK_SECRET=uzun-rastgele-bir-deger
PUBLIC_BACKEND_URL=https://koopilot-backend.onrender.com
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v20.0
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

Telegram Bot API resmi olarak webhook modunda HTTPS URL'e update gönderir. `secret_token` verilirse Telegram her webhook isteğinde `X-Telegram-Bot-Api-Secret-Token` header'ı yollar; backend bu değeri doğrular.

1. Telegram'da resmi `@BotFather` hesabını aç.
2. `/newbot` yaz.
3. Bot adı ver: `Koopilot Demo`
4. Bot kullanıcı adı ver. Sonu `bot` ile bitmeli, örnek: `koopilot_demo_bot`.
5. BotFather'ın verdiği token'ı kopyala.
6. Render > `koopilot-backend` > **Environment** bölümüne ekle:

```env
TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_WEBHOOK_SECRET=<tahmin edilmesi zor rastgele metin>
PUBLIC_BACKEND_URL=https://koopilot-backend.onrender.com
```

7. Render'da **Manual Deploy > Deploy latest commit** yap.
8. Deploy bitince token ve webhook durumunu kontrol et:

```bash
curl https://koopilot-backend.onrender.com/integrations/telegram/status
```

9. Webhook'u backend üzerinden kur:

```bash
curl -X POST "https://koopilot-backend.onrender.com/integrations/telegram/setup-webhook?drop_pending_updates=true"
```

Alternatif olarak Telegram API'ye direkt de kurulabilir:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://koopilot-backend.onrender.com/integrations/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","drop_pending_updates":true,"allowed_updates":["message","edited_message"]}'
```

10. Webhook durumunu tekrar kontrol et:

```bash
curl https://koopilot-backend.onrender.com/integrations/telegram/status
```

Beklenen kritik alanlar:

```text
token_configured: true
webhook_configured: true
webhook_matches_expected: true
```

11. Telegram botuna `/start` yaz.
12. Ardından demo mesajı at:

```text
Merhaba, ben Ayşe Yılmaz. 05551234567.
Ankara Çankaya Atatürk Mah. No 12.
2 kavanoz ev yapımı salça ve 1 nar ekşisi almak istiyorum.
```

Beklenen sonuç:

- Bot cevap döner.
- Backend'de mesaj loglanır.
- Sipariş taslağı panelde görünür.
- UI'daki **Kanallar** sayfasında Telegram durumu “Canlı bağlı” görünür.

## Demo Sırasında Dikkat

- Render free servis uykuya geçebilir; demo başlamadan 2-3 dakika önce `/health` ve `/docs` açılarak uyandırılmalı.
- Telegram token yoksa webhook analiz sonucunu JSON dönebilir ama Telegram'a gerçek cevap göndermez.
- Telegram tokenı Render env'e girildikten sonra mutlaka redeploy gerekir.
- WhatsApp gerçek API canlı bağlı değilse bu açıkça söylenmeli; UI'daki Kanallar sayfasında “Canlı bağlantı yok” durumu gösterilmeli.
- Mesajlar sayfasındaki web panel test akışı, WhatsApp mesajının gerçek kanaldan geldiği izlenimi verilmeden kullanılmalı.
- Canlı demo patlarsa video ve lokal çalışan demo yedek plan olarak hazır olmalı.

## Kazandıran Anlatım

> Koopilot bugün web panelindeki test akışından ve token tanımlanırsa Telegram gibi gerçek mesaj kanallarından gelen müşteri mesajlarını aynı AI ajan hattına alabiliyor. WhatsApp için canlı Business API bağlantısı şu an aktif değil; ancak backend'de webhook doğrulama, gelen mesajı AI ajan hattına aktarma ve token tanımlanınca cevap gönderme adaptörü hazır. Demoda bu durumu saklamadan Kanallar sayfasında gösteriyoruz.
