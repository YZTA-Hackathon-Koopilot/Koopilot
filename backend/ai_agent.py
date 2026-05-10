import os
from dotenv import load_dotenv
from schemas import AIFinalResponse, AIParsedProduct
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
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=prompt,
        config={
            'response_mime_type': 'application/json',
            'response_schema': AIFinalResponse,
            'temperature': 0.1
        },
    )
    try:
        data = json.loads(response.text)
        return AIFinalResponse(**data)
    except Exception as e:
        error_msg = str(e)
        print(f"AI İşlem Hatası: {error_msg}")
        
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return AIFinalResponse(
                intent="general_question",
                ai_reply_draft="Sistemimizde anlık bir yoğunluk yaşanıyor. Lütfen yaklaşık 30-40 saniye bekleyip tekrar deneyiniz."
            )

        return analyze_message_locally(message)
