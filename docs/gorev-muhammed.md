# Muhammed - Backend ve AI

## Öncelik

Demo akışının uçtan uca ve API anahtarı riskine rağmen çalışmasını sağlamak.

## Yapılacaklar

- FastAPI endpointlerini stabil tut: `/ai/analyze-message`, `/orders`, `/inventory`, `/shipping`.
- Gemini yanıtı başarısız olursa fallback analizinin demo senaryosunu çalıştırdığını kontrol et.
- Ürün eşleştirmeyi doğal Türkçe ifadelerde test et: "ev yapımı salça", "nar ekşisi", "zeytinyağı".
- Sipariş onayında eksik bilgi, eksik miktar ve yetersiz stok hatalarını anlaşılır döndür.
- `/docs` ekranında demo sırasında gösterilecek endpointleri hazır tut.

## Demo Test Senaryosu

```text
Ben Ayşe Yılmaz, 05551234567. Ankara Çankaya Atatürk Mah. No 12.
2 kavanoz ev yapımı salça ve 1 nar ekşisi almak istiyorum.
```

Beklenen sonuç: AI analizi `new_order` döner, sipariş taslağı oluşur, ürün kalemleri görünür.
