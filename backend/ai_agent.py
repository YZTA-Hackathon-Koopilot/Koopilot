import os
from dotenv import load_dotenv
from schemas import AIFinalResponse, AIParsedProduct, StaffAssistantDecision, StaffAssistantTextResponse
import json
import re

try:
    from google import genai
except ImportError:
    genai = None


PRODUCT_KEYWORDS = {
    "Domates Salçası": ["domates salçası", "domates salcasi", "ev yapımı salça", "ev yapimi salca"],
    "Biber Salçası (Acı)": ["biber salçası", "biber salcasi", "acı salça", "aci salca", "acı biber", "aci biber"],
    "Nar Ekşisi": ["nar ekşisi", "nar eksisi", "nareksisi"],
    "Zeytinyağı (Soğuk Sıkım)": ["zeytinyağı", "zeytinyagi", "soğuk sıkım", "soguk sikim"],
    "Kuru Fasulye": ["kuru fasulye", "fasulye"],
    "El Yapımı Erişte": ["erişte", "eriste", "el yapımı erişte", "el yapimi eriste"],
    "Çilek Reçeli": ["çilek reçeli", "cilek receli", "reçel", "recel"],
    "Süzme Bal": ["süzme bal", "suzme bal", "bal"],
}

CITY_NAMES = [
    "adana", "ankara", "antalya", "bursa", "diyarbakır", "diyarbakir", "gaziantep",
    "hatay", "istanbul", "izmir", "kayseri", "konya", "mersin", "samsun", "trabzon"
]


def get_client():
    if genai is None:
        return None
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None
    return genai.Client(api_key=api_key)


def get_staff_model():
    load_dotenv(override=True)
    return os.getenv("GEMINI_STAFF_MODEL") or "gemini-3.1-flash-lite"


def _json_default(value):
    if hasattr(value, "value"):
        return value.value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=_json_default)


def _require_client():
    client = get_client()
    if not client:
        raise RuntimeError("Gemini API anahtarı tanımlı değil. Panel operasyon asistanı otomatik cevap üretmez; GEMINI_API_KEY gerekli.")
    return client


def decide_staff_action_with_ai(message: str, context: dict, history: list[dict] | None = None) -> StaffAssistantDecision:
    client = _require_client()
    prompt = f"""
Sen Koopilot panelinin içindeki PERSONEL OPERASYON ASİSTANISIN.
Sen müşteriyle değil, kooperatif/KOBİ çalışanı olan panel kullanıcısıyla konuşuyorsun.

Görevin:
- Personelle doğal, kısa ve profesyonel Türkçe konuş.
- Personel isterse sohbet et, kendini tanıt, ne işe yaradığını açıkla.
- Cevap metninde sade Markdown kullanabilirsin: kısa paragraflar, `-` maddeleri, **kalın vurgu** ve gerektiğinde tablo.
- Personel "ben kimim", "hesabım ne" gibi sorarsa sadece Bağlam.current_user alanındaki name/email/role bilgisini kullan; yoksa bilgiye erişemediğini söyle.
- Personele adıyla hitap edeceksen Bağlam.current_user.preferred_address değerini kullan. Örnek: Ahmet -> Ahmet Bey, Zeynep -> Zeynep Hanım. Her cümlede tekrarlama; selamlaşma ve kişisel cevaplarda doğal kullan.
- Personelin operasyon isteğini anla ve aşağıdaki action'lardan birini seç.
- Sadece gerçekten istenen işlemi seç. Emin değilsen action="chat" veya "unknown" seçip netleştirici cevap yaz.
- Müşteri destek botu gibi konuşma. "Ürünlerimizi inceleyebilirsiniz" gibi müşteriye dönük cevaplar verme.
- Eski yerel netleştirme kalıplarını kullanma; her durumda personelle doğal konuş.
- Bir müşteri mesajı analiz edilecekse personel genelde "müşteri mesajı:", "müşteri yazdı:", "şunu analiz et:" gibi belirtir. O zaman action="analyze_customer_message" seç ve customer_message alanını doldur.

Seçilebilir action'lar:
- chat: normal sohbet, açıklama, kendini tanıtma, kullanıcı/profil bilgisi, yetenek anlatımı
- list_orders: sipariş listeleme
- order_detail: tek sipariş detayı
- approve_order: taslak sipariş onaylama ve stoktan düşme
- reject_order: sipariş reddetme/iptal etme
- delete_order: sipariş silme
- list_products: stok/ürün listeleme
- product_detail: tek ürün stok/fiyat detayı
- update_product: ürün stok/fiyat güncelleme
- bulk_update_products: birden fazla ürünün stok/fiyatını toplu güncelleme. Örnekler:
  * "tüm stokları 2 katına çıkar" -> bulk_scope="all_products", stock_multiplier=2
  * "kritik stokları 5 artır" -> bulk_scope="critical_stock", stock_delta=5
  * "tüm fiyatları yüzde 10 artır" -> bulk_scope="all_products", price_multiplier=1.1
- create_product: yeni ürün oluşturma
- list_shipments: kargo/takipteki siparişleri listeleme
- update_shipping: sipariş kargo durumunu güncelleme
- daily_summary: operasyon özeti
- analyze_customer_message: yapıştırılan müşteri mesajını sipariş/niyet analizi akışına gönderme
- unknown: isteğin ne olduğu anlaşılmadı

Bağlam:
{_to_json(context)}

Son panel sohbet geçmişi:
{_to_json(history or [])}

Personelin son mesajı:
{message}

JSON üret. response alanı, personele doğal bir ilk cevap/niyet açıklaması olsun.
Veritabanı işleminin yapıldığını iddia etme; backend işlemi uyguladıktan sonra nihai cevap ayrıca üretilecek.
Stok, fiyat, sipariş, kargo veya ürün üzerinde değişiklik isteyen mesajlarda action="chat" seçme; uygun operasyon action'ını seç veya eksik bilgi varsa action="unknown" ile netleştir.
"""
    try:
        response = client.models.generate_content(
            model=get_staff_model(),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StaffAssistantDecision,
                "temperature": 0.15,
            },
        )
        data = json.loads(response.text)
        return StaffAssistantDecision(**data)
    except Exception as e:
        print(f"Staff AI Decision Error: {e}")
        # Robust fallback for demo stability
        return StaffAssistantDecision(
            action="chat",
            response="Şu an Gemini servislerinde bir yoğunluk yaşanıyor. Size yardımcı olmaya devam edebilirim ancak bazı operasyonel yeteneklerim geçici olarak kısıtlanmış olabilir. Lütfen birazdan tekrar deneyin.",
            confidence=0.5
        )


def compose_staff_response_with_ai(
    message: str,
    context: dict,
    decision: StaffAssistantDecision,
    operation_result: dict,
    history: list[dict] | None = None,
) -> str:
    client = _require_client()
    prompt = f"""
Sen Koopilot panelinin personel operasyon asistanısın.
Panel kullanıcısı müşteridir değil, personeldir.

Nihai cevabını şu kurallarla yaz:
- Türkçe, doğal, net ve işe dönük ol.
- Personele adıyla hitap edeceksen güncel bağlamdaki current_user.preferred_address değerini kullan. Her cevapta zorla tekrar etme; selamlaşma, kişisel cevap ve önemli işlem sonuçlarında doğal kullan.
- Yapılan işlem varsa sonucunu açıkça söyle.
- Cevapları sade Markdown ile biçimlendir. Liste gerektiren sonuçlarda her kalemi ayrı satırda `-` ile yaz. Kritik değerleri **kalın** göster. Tabloyu sadece gerçekten karşılaştırma gerekiyorsa kullan.
- Backend operasyon sonucu executed=false ise işlem yapılmamıştır. Böyle bir durumda kesinlikle "güncelledim", "onayladım", "yaptım" gibi başarı iddiası yazma.
- Liste/veri varsa okunabilir maddelerle özetle.
- Eksik bilgi veya hata varsa personelin bir sonraki adımını söyle.
- Müşteri destek botu gibi cevap verme.
- Veride olmayan şeyi uydurma.

Personel mesajı:
{message}

Gemini kararın:
{decision.model_dump_json()}

Backend operasyon sonucu:
{_to_json(operation_result)}

Güncel bağlam:
{_to_json(context)}

Son panel sohbet geçmişi:
{_to_json(history or [])}
"""
    try:
        response = client.models.generate_content(
            model=get_staff_model(),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StaffAssistantTextResponse,
                "temperature": 0.35,
            },
        )
        data = json.loads(response.text)
        return StaffAssistantTextResponse(**data).response.strip()
    except Exception as e:
        print(f"Compose Staff Response Error: {e}")
        return decision.response # Use the initial decision response as fallback


def _extract_quantity(message: str, keyword: str) -> float | None:
    normalized = message.lower()
    keyword_index = normalized.find(keyword.lower())
    if keyword_index == -1:
        return None

    before = normalized[max(0, keyword_index - 32):keyword_index]
    after = normalized[keyword_index:keyword_index + 48]
    match = re.search(r"(\d+(?:[,.]\d+)?)\s*(?:adet|tane|kavanoz|şişe|sise|kg|kilo|litre)?", before)
    if not match:
        match = re.search(r"(\d+(?:[,.]\d+)?)\s*(?:adet|tane|kavanoz|şişe|sise|kg|kilo|litre)?", after)
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def analyze_message_locally(message: str) -> AIFinalResponse:
    normalized = message.lower()
    products = []
    missing_info = []

    for product_name, keywords in PRODUCT_KEYWORDS.items():
        matched_keyword = next((keyword for keyword in keywords if keyword in normalized), None)
        if not matched_keyword:
            continue
        quantity = _extract_quantity(message, matched_keyword)
        if quantity is None:
            missing_info.append(f"{product_name} miktarı")
        products.append(AIParsedProduct(name=product_name, quantity=quantity))

    phone_match = re.search(r"(?:\+?90\s*)?0?5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}", message)
    phone = re.sub(r"\s+", "", phone_match.group(0)) if phone_match else None
    city = next((city.title() for city in CITY_NAMES if city in normalized), None)
    name_match = re.search(r"(?:adım|adim|ben|isim)\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+){0,2})", message)
    customer_name = name_match.group(1).strip().title() if name_match else None
    has_address = any(word in normalized for word in ["mah", "mahalle", "sokak", "sk", "cadde", "cd", "no:", "no ", "apartman", "daire"])

    if any(word in normalized for word in ["kargom", "kargo", "nerede", "takip"]):
        intent = "shipping_query"
        reply = "Merhaba, kargo durumunuzu kontrol edebilmem için sipariş numaranızı veya siparişteki telefon numaranızı paylaşır mısınız?"
    elif any(word in normalized for word in ["iade", "geri göndermek", "geri gondermek"]):
        intent = "return_request"
        reply = "Merhaba, iade talebinizi aldık. Sipariş numaranızı ve iade nedeninizi paylaşırsanız ekibimiz süreci başlatacaktır."
    elif any(word in normalized for word in ["bozuk", "kırık", "kirik", "şikayet", "sikayet", "geç geldi", "gec geldi"]):
        intent = "complaint"
        reply = "Merhaba, yaşadığınız sorun için üzgünüz. Sipariş numaranızı ve kısa bir açıklama paylaşırsanız hemen ilgilenelim."
    elif products or any(word in normalized for word in ["almak", "istiyorum", "sipariş", "siparis", "var mı", "var mi"]):
        intent = "new_order"
        if not phone:
            missing_info.append("telefon")
        if not city:
            missing_info.append("şehir")
        if not has_address:
            missing_info.append("açık adres")
        if not customer_name:
            missing_info.append("isim")

        if products:
            product_text = ", ".join(p.name for p in products)
            reply = f"Merhaba, {product_text} talebinizi aldım. Sipariş taslağını hazırlıyorum."
        else:
            reply = "Merhaba, hangi üründen kaç adet istediğinizi paylaşır mısınız?"

        if missing_info:
            reply += " Siparişi tamamlamak için " + ", ".join(dict.fromkeys(missing_info)) + " bilgisini rica ederiz."
    else:
        intent = "general_question"
        reply = "Merhaba, ürünlerimiz ve sipariş süreçlerimiz hakkında yardımcı olmaktan memnuniyet duyarız."

    return AIFinalResponse(
        intent=intent,
        customer_name=customer_name,
        phone=phone,
        address=message if has_address else None,
        city=city,
        products=products,
        missing_info=list(dict.fromkeys(missing_info)),
        ai_reply_draft=reply
    )


def analyze_message_with_ai(message: str, company_profile: str = "Koopilot - KOBİ ve Kooperatif Operasyon Ajanı", history: str = "", catalog: str = "") -> AIFinalResponse:
    client = get_client()
    if not client:
        return analyze_message_locally(message)
    prompt = f"""
    Sen '{company_profile}' adlı kadın kooperatifleri ve KOBİ'ler için çalışan AI destekli bir operasyon ve sipariş yönetimi asistanısın.
    Amacın, müşterilerin doğal dille yazdığı mesajları anlamak ve kooperatif yöneticisinin işini kolaylaştıracak yapılandırılmış veriler üretmektir.

    --- KURUM KİMLİĞİ VE TON ---
    - Dilin nazik, yardımsever ve profesyonel olmalı (Kadın kooperatifi ruhuna uygun, samimi ama ciddi).
    - Müşterilere "Merhaba", "Değerli Müşterimiz", "🌿" gibi ifadelerle hitap edebilirsin.
    
    --- ÜRÜN KATALOĞU VE EŞLEŞTİRME ---
    Katalogdaki ürün isimleri ile müşterinin yazdığı isimler birebir tutmayabilir. 
    Örnek: "ev yapımı salça" -> "Domates Salçası" veya "acı biber" -> "Biber Salçası (Acı)" olabilir. 
    Lütfen en yakın anlamlı eşleşmeyi yapmaya çalış.
    
    Katalog:
    {catalog if catalog else "Şu an sistemde ürün bulunmuyor."}
    ------------------------------------

    --- GEÇMİŞ SOHBET (BAĞLAM) ---
    {history if history else "Önceki sohbet yok."}
    -------------------------------

    Müşteri Son Mesajı: "{message}"

    Gereksinimler:
    1. Mesajın niyetini (intent) belirle: 
       - 'new_order': Sipariş vermek istiyor.
       - 'shipping_query': "Kargom nerede?", "Ne zaman gelir?" gibi sorular.
       - 'complaint': "Ürün bozuk çıktı", "Geç geldi" gibi şikayetler.
       - 'return_request': "İade etmek istiyorum".
       - 'general_question': Ürün içeriği, fiyatı veya genel bilgi sorma.
    2. Eğer niyet 'new_order' ise:
       - Ürünleri, miktarlarını (quantity) ve birimlerini (unit) çıkar. 
       - Katalogdaki birimleri (kg, adet, kavanoz vb.) mutlaka kontrol et. 
       - Eğer müşteri miktar belirtmemişse, `quantity` alanını boş (null) bırak ve `missing_info` listesine mutlaka "miktar" veya hangi ürünün miktarı eksikse onu (örn: "çilek reçeli miktarı") ekle.
       - İsim, telefon, şehir ve açık adresi bulmaya çalış.
       - Eksik olan tüm bilgileri (isim, telefon, adres, miktar vb.) 'missing_info' listesine ekle.
    3. 'ai_reply_draft' alanına müşteriye gönderilecek cevabı yaz. 
       - Eğer bilgi eksikse (örn: adres yoksa veya miktar belirtilmemişse) nazikçe iste. 
       - Miktar isterken katalogdaki birimi kullan (Örn: "Kaç kavanoz çilek reçeli istersiniz?").
       - Eğer stokta olmayan bir ürün istenirse nazikçe belirt ve alternatif öner.
    """
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': AIFinalResponse,
                'temperature': 0.1
            },
        )
        data = json.loads(response.text)
        return AIFinalResponse(**data)
    except Exception as e:
        error_msg = str(e)
        print(f"AI Analysis Error: {error_msg}")
        
        if "503" in error_msg or "UNAVAILABLE" in error_msg or "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            # Fallback to local analysis for demo stability
            return analyze_message_locally(message)

        return analyze_message_locally(message)


def generate_campaign_suggestion(product_name: str, price: float, stock: float) -> str:
    client = get_client()
    prompt = f"""
    Sen 'Koopilot' adlı AI asistanısın. 
    Elimizde son 7 gündür hiç satılmayan bir ürün var:
    Ürün Adı: {product_name}
    Mevcut Fiyat: {price} TL
    Stok Durumu: {stock}

    Lütfen bu ürün için profesyonel, ilgi çekici ve kooperatif ruhuna uygun bir kampanya/indirim kurgusu hazırla.
    Cevaba selamlama, kendini tanıtma veya "Merhaba, ben Koopilot" gibi giriş cümlesiyle başlama.
    Sadece aşağıdaki Markdown gövdesini üret.
    Markdown formatında, kısa ve uygulanabilir cevap ver.
    Panelin şu anda gerçekten uygulayabildiği tek otomatik aksiyon ürün fiyatı güncellemesidir.
    "Günün Fırsatları", "Öne Çıkanlar", "Çok Satanlar", "İndirim Yönetimi" gibi panelde olmayan sayfa/bölüm/özellikleri uygulanabilir aksiyon olarak yazma.
    Şu başlıkları kullan:
    ### Kampanya Fikri
    - Net kampanya adı ve indirim oranı
    - Müşteriye söylenecek kısa değer önerisi

    ### Panelde Uygulanabilir Aksiyonlar
    - Sadece yeni fiyatı içeren tek madde yaz. Örnek: Ürün fiyatını 112 TL olarak güncelle.

    ### Stratejik Notlar
    - Panelde otomatik uygulanamayan 2 kısa pazarlama fikri yaz
    - Bu notlarda olmayan panel sayfası varmış gibi konuşma; "ileride eklenebilir" veya "manuel paylaşımda kullanılabilir" gibi dürüst ifadeler kullan
    """
    
    if not client:
        return (
            f"### Kampanya Fikri\n"
            f"- **{product_name} Bahar Paketi:** %15 indirimle stokları hareketlendirebiliriz.\n"
            f"- Ürünün doğal ve kooperatif emeğiyle hazırlanmış yönünü öne çıkaralım.\n\n"
            f"### Panelde Uygulanabilir Aksiyonlar\n"
            f"- Ürün fiyatını {round(price * 0.85, 2)} TL olarak güncelle.\n\n"
            f"### Stratejik Notlar\n"
            f"- Bu kampanya metni Telegram veya sosyal medya paylaşımında manuel kullanılabilir.\n"
            f"- Ürün görselinde kooperatif emeği ve doğal içerik vurgusu öne çıkarılabilir."
        )

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Campaign Suggestion Error: {e}")
        return (
            f"### Kampanya Fikri\n"
            f"- **{product_name} Bahar Paketi:** %15 indirimle stokları hareketlendirebiliriz.\n"
            f"- Ürünün doğal ve kooperatif emeğiyle hazırlanmış yönünü öne çıkaralım.\n\n"
            f"### Panelde Uygulanabilir Aksiyonlar\n"
            f"- Ürün fiyatını {round(price * 0.85, 2)} TL olarak güncelle.\n\n"
            f"### Stratejik Notlar\n"
            f"- Bu kampanya metni Telegram veya sosyal medya paylaşımında manuel kullanılabilir.\n"
            f"- Ürün görselinde kooperatif emeği ve doğal içerik vurgusu öne çıkarılabilir."
        )
