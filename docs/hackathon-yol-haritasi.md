# Koopilot Hackathon Yol Haritası

## Hedef

Koopilot gerçek hayatta tamamen yayına alınacak olgunlukta bir ürün olmak zorunda değil. Bu hackathon için hedefimiz, jürinin 1 dakikada şunu görmesini sağlamak:

> Koopilot, kadın kooperatiflerinin WhatsApp/mesaj üzerinden gelen sipariş, stok ve kargo iş yükünü AI ajanla azaltan çalışan bir operasyon panelidir.

Bu yüzden odağımız büyük kapsam değil; net problem, çalışan demo, güçlü AI kullanımı, temiz sunum ve anlaşılır dokümantasyon.

## Projenin Gelmesi Gereken Nokta

Evet, bence **canlıya alma hackathon için çok iyi hamle**. Jüriye “çalışan link” vermek puan getirir. Ama gerçek ürün gibi WhatsApp entegrasyonuna gömülmeyelim; orada vakit yakarız.

**Benim önerim:**

1. **Backend:** Render Free Web Service  
2. **Frontend:** Vercel / Netlify / Render Static Site  
3. **Mesaj kanalı:** Gerçek WhatsApp yerine önce mock WhatsApp + opsiyonel Telegram bot  
4. **WhatsApp:** Şimdilik gerçek entegrasyon yapmayalım, README’de “adapter mimarisi hazır” diyelim.

Render mantıklı çünkü FastAPI web service ücretsiz deploy edilebiliyor. Ama free servis 15 dakika boşta kalırsa uykuya geçiyor, sonraki istekte açılması 1 dakikaya kadar sürebiliyor. Hackathon demosunda linke önceden tıklayıp uyandırırız. Render free web service için 750 saat/ay sınırı da var. Kaynak: Render free docs.  
https://render.com/free

Backend Render ayarı şöyle olur:

```bash
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
Environment:
GEMINI_API_KEY=...
```

Frontend için `VITE_API_URL` şuna döner:

```env
VITE_API_URL=https://koopilot-backend.onrender.com
```

Telegram tarafı bence en mantıklı ücretsiz gerçek kanal. Telegram Bot API resmi HTTP tabanlı bot arayüzü sağlıyor; botu BotFather ile açıp backend’e webhook bağlayabiliriz. Telegram API’leri pratikte ücretsiz kullanılabiliyor, kurulum WhatsApp’a göre çok daha hızlı. Kaynak: Telegram Bot API docs.  
https://core.telegram.org/bots/api

WhatsApp tarafında ise dikkat: WhatsApp Business Platform gerçek API tarafı daha karmaşık. Meta’nın resmi fiyatlandırmasında mesaj kategorileri var, bazı ücretsiz entry point pencereleri var ama bu “tamamen ücretsiz ve rahatça bağlanır” demek değil. Business setup, phone number, webhook, token, template/mesaj kuralları gibi uğraştırıcı işler var. Kaynak: WhatsApp Business Platform pricing.  
https://whatsappbusiness.com/products/platform-pricing

Benim net kararım:

**Hackathon için WhatsApp gerçek API’ye girmeyelim.**  
Onun yerine:

- UI’da “WhatsApp Mock Inbox” gösterelim.
- README’de “WhatsApp Business API adapter olarak bağlanabilir” diyelim.
- Zaman kalırsa Telegram botu gerçek kanal olarak ekleyelim.

Bu strateji jüriye şöyle satılır:

> Hackathon süresi nedeniyle WhatsApp entegrasyonu mock adapter olarak tasarlandı. Aynı mimari Telegram Bot API veya WhatsApp Business API webhook’una bağlanabilir. Telegram üzerinden canlı mesaj akışı da opsiyonel gerçek kanal olarak desteklenebilir.

Yani canlı ürün hedefi:

- Frontend linki var.
- Backend linki var.
- `/docs` çalışıyor.
- Demo verisi çalışıyor.
- Mock WhatsApp mesajı siparişe dönüşüyor.
- İstersek Telegram’dan gerçek mesaj gönderince aynı analiz endpoint’ine düşüyor.

Bence bir sonraki en iyi iş: Render deploy hazırlığı için küçük bir `render.yaml` veya deploy dokümanı yazmak, ardından Telegram webhook adapter’ı eklemek.

Demo sonunda ürün şu hikayeyi kusursuz göstermeli:

1. Müşteri doğal Türkçe bir mesaj yazar.
2. AI mesajın niyetini anlar: sipariş, kargo sorusu, şikayet, iade veya genel soru.
3. Sipariş mesajından ürün, adet, şehir, telefon, adres ve eksik bilgileri çıkarır.
4. Ürünleri katalog/stok ile eşleştirir.
5. Stok bilgisine göre cevap taslağı üretir.
6. Yönetici panelinde sipariş taslağı oluşur.
7. İnsan onay verince sipariş kesinleşir ve stok düşer.
8. Kargo panelinde siparişin durumu takip edilir.
9. Günlük özet panelinde operasyon etkisi görünür.

Ürün şu cümleyi kanıtlamalı:

> Biz chatbot yapmadık; kooperatifin gelen mesajlarını siparişe, stok aksiyonuna ve kargo cevabına dönüştüren bir operasyon ajanı yaptık.

## Kazandıracak Öncelikler

### P0 - Mutlaka Bitmeli

- Backend ve frontend tek komut setiyle çalışmalı.
- `/docs` sayfası açılmalı ve endpointler görünmeli.
- Mesaj analizi demo senaryosunda hatasız çalışmalı.
- Gemini API çalışmazsa fallback sistem demo akışını bozmayacak kadar iyi olmalı.
- Sipariş taslağı oluşmalı ve sipariş panelinde ürün kalemleri görünmeli.
- Sipariş onaylanınca stok düşmeli.
- Stok yetersizliği veya eksik bilgi kullanıcıya anlaşılır dönmeli.
- Kargo panelinde en az bir sipariş için durum gösterilmeli ve güncellenebilmeli.
- Günlük özet paneli mesaj sayısı, niyet dağılımı ve düşük stok uyarısını göstermeli.
- Chat geçmişi, yeni sohbet ve dark mode kırılmadan çalışmalı.
- README güncel kurulum, model, demo akışı ve mimari bilgisini içermeli.

### P1 - Puanı Artırır

- Mesaj panelinde hazır demo mesajı butonları eklenmeli.
- Sipariş panelinde toplam tutar gösterilmeli.
- AI analiz sonucu küçük bir kartta görünmeli: niyet, eksik bilgi, eşleşen ürünler.
- Stok panelinde "talep var ama stok düşük" uyarısı görünmeli.
- Günlük özet daha etkileyici hale getirilmeli:
  - kaç mesaj işlendi
  - kaç sipariş taslağı üretildi
  - en çok sorulan ürün
  - düşük stok uyarıları
- Demo için veritabanı reset/init süreci güvenilir hale getirilmeli.
- 1 dakikalık video metni ve ekran sırası kesinleştirilmeli.

### P2 - Zaman Kalırsa

- Basit grafikler eklenebilir.
- Mock WhatsApp görünümü daha gerçekçi yapılabilir.
- Ürün eşleştirme daha fazla varyasyonu destekleyebilir.
- Kargo cevabı AI tarafından daha doğal yazılabilir.
- README’ye ekran görüntüleri eklenebilir.
- Dockerfile eklenebilir.

## Demo Senaryosu

Demo için tek ana akış seçilmeli ve kusursuz çalışmalı.

### Müşteri Mesajı

```text
Merhaba, ben Ayşe Yılmaz. 05551234567.
Ankara Çankaya Atatürk Mah. No 12.
2 kavanoz ev yapımı salça ve 1 nar ekşisi almak istiyorum.
```

### Beklenen Sonuç

- AI intent: `new_order`
- Ürünler:
  - Domates Salçası, 2 kavanoz
  - Nar Ekşisi, 1 şişe
- Sipariş taslağı oluşur.
- Stok bilgisi cevap taslağına yansır.
- Sipariş panelinde ürün kalemleri görünür.
- Yönetici onaylayınca stoktan düşer.

### Kargo Demo Mesajı

```text
Kargom nerede? Telefonum 05551234567.
```

Beklenen sonuç:

- AI intent: `shipping_query`
- Sistem ilgili siparişi bulur veya eksik bilgi ister.
- Kargo panelinde durum gösterilir.

## 1 Dakikalık Video Akışı

| Süre | Ekran | Anlatılacak Şey |
|---|---|---|
| 0-7 sn | Mesajlar | Kooperatiflerde WhatsApp + Excel iş yükü var. |
| 7-22 sn | Mesajlar | Müşteri mesajı girilir, AI siparişi ve eksikleri çıkarır. |
| 22-35 sn | Siparişler | Sipariş taslağı ve ürün kalemleri görünür, insan onaylar. |
| 35-45 sn | Stok | Onay sonrası stok düşer, düşük stok uyarısı görünür. |
| 45-53 sn | Kargo | Siparişin kargo durumu takip edilir. |
| 53-60 sn | Günlük Özet | Koopilot günün operasyon etkisini özetler. |

Kapanış cümlesi:

> Koopilot, kooperatiflerin mesaj trafiğini sipariş, stok ve kargo aksiyonuna dönüştüren dijital ekip arkadaşıdır.

## Değerlendirme Kriterlerine Göre Durum

### Problem Tanımı ve Değer Önerisi

Güçlü. Tema ile birebir uyumlu. Kadın kooperatifleri ve KOBİ’lerdeki manuel mesaj, sipariş, stok ve kargo yükünü çözüyor.

Yapılması gereken:

- README ve video içinde bu problem çok net anlatılmalı.
- “WhatsApp + Excel yükü” ifadesi demo başında geçmeli.

### AI Kullanımı

Güçlü ama görünür hale getirilmeli. AI sadece cevap üretmiyor; niyet çıkarıyor, ürün eşleştiriyor, eksik bilgi buluyor, cevap taslağı yazıyor.

Yapılması gereken:

- UI’da AI analiz sonucu daha açık gösterilmeli.
- README’de Gemini 3.1 Flash-Lite ve structured output anlatımı güncel tutulmalı.

### Teknik Mimari

Yeterli. FastAPI, SQLite, React, Gemini ve mock servis yaklaşımı hackathon için doğru.

Yapılması gereken:

- Kurulum adımları kesin çalışmalı.
- API docs demo sırasında gösterilebilir olmalı.

### Kullanıcı Deneyimi

İyi yolda. Dashboard yapısı, dark mode, chat geçmişi ve sayfa animasyonları ürünü daha olgun gösteriyor.

Yapılması gereken:

- Demo akışındaki ekranlar sade ve okunur kalmalı.
- Header/sidebar sabit, sadece içerik değişiyor hissi korunmalı.

### Çalışabilirlik

En kritik alan. Jüri için çalışan demo her şeyden önemli.

Yapılması gereken:

- Demo veritabanı temiz init edilmeli.
- Demo mesajı en az 5 kez uçtan uca test edilmeli.
- Gemini hata verse bile fallback akışının çalıştığı doğrulanmalı.

### Dokümantasyon

README güçlü başlamış durumda.

Yapılması gereken:

- Son ekran görüntüleri eklenmeli.
- Demo komutları sadeleştirilmeli.
- Teslim öncesi “AI nerede kullanılıyor?” bölümü güncellenmeli.

## Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Gemini API hata/limit | Demo çöker | Fallback analiz korunmalı |
| Ürün eşleştirme kaçırır | Sipariş oluşmaz | Demo mesajı sabit ve testli olmalı |
| Eksik bilgi yüzünden onay olmaz | Akış yarım kalır | Demo mesajında isim, telefon, adres bulunmalı |
| Frontend state karışır | Demo güveni düşer | Yeni sohbet/geçmiş akışı test edilmeli |
| Son gün video yetişmez | Teslim riski | Video metni ve ekran sırası önceden hazırlanmalı |

## Teslim Checklist

- Backend çalışıyor.
- Frontend çalışıyor.
- `/docs` açılıyor.
- Demo verileri yüklü.
- Ana demo mesajı çalışıyor.
- Sipariş taslağı oluşuyor.
- Sipariş onaylanıyor.
- Stok düşüyor.
- Kargo paneli çalışıyor.
- Günlük özet dolu görünüyor.
- README güncel.
- Pitch deck en fazla 10 sayfa.
- 1 dakikalık video hazır.
- GitHub repo public.
- Teslim formu son saate kalmadan dolduruluyor.

## Ekip İçin Net Görev Paylaşımı

### Muhammed

- Backend stabilizasyonu.
- Gemini/fallback davranışı.
- Sipariş, stok ve kargo endpointleri.
- README teknik kurulum ve API bölümü.

### Kaan

- Frontend demo akışı.
- UI okunurluğu.
- Chat geçmişi, dark mode, animasyonlar.
- Ekran görüntüleri.

### Zeynep

- Demo senaryosu ve test.
- 1 dakikalık video.
- Pitch deck.
- Teslim formu ve jüri anlatısı.

## Son Karar

Bu proje hackathon için doğru yolda. Kazanma ihtimalini artıracak şey daha fazla özellik eklemek değil; seçilmiş tek ana akışı kusursuz, hızlı, anlaşılır ve etkileyici hale getirmek.

Öncelik sırası:

1. Demo akışı çalışsın.
2. UI’da AI’nın yaptığı iş görünür olsun.
3. README ve video jüriye doğrudan konuşsun.
4. Son gün yeni özellik değil, test ve sunum yapılsın.
