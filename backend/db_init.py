from database import SessionLocal, engine, Base
import models
from datetime import datetime, timedelta
def init_db():
    print("Veritabanı tabloları oluşturuluyor...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Product).first():
            print("Veritabanında zaten veriler mevcut. İşlem atlanıyor.")
            return
        print("Dummy ürünler ekleniyor...")
        products = [
            models.Product(name="Domates Salçası", category="Gıda", stock=25, price=85.0, unit="Kavanoz", description="Ev yapımı, doğal domates salçası"),
            models.Product(name="Biber Salçası (Acı)", category="Gıda", stock=15, price=95.0, unit="Kavanoz", description="Köy usulü acı biber salçası"),
            models.Product(name="Nar Ekşisi", category="Gıda", stock=30, price=120.0, unit="Şişe", description="100% doğal nar ekşisi"),
            models.Product(name="Zeytinyağı (Soğuk Sıkım)", category="Gıda", stock=3, price=450.0, unit="Litre", description="Erken hasat soğuk sıkım zeytinyağı"),
            models.Product(name="Kuru Fasulye", category="Bakliyat", stock=40, price=75.0, unit="kg", description="İspir fasulyesi"),
            models.Product(name="El Yapımı Erişte", category="Gıda", stock=20, price=60.0, unit="Paket", description="Yumurtalı köy eriştesi"),
            models.Product(name="Çilek Reçeli", category="Gıda", stock=12, price=70.0, unit="Kavanoz", description="Taze çileklerle hazırlanmış reçel"),
            models.Product(name="Süzme Bal", category="Gıda", stock=8, price=320.0, unit="Kavanoz", description="Yüksek rakım yayla balı")
        ]
        db.add_all(products)
        db.commit()

        logs = [
            models.MessageLog(session_id="s1", raw_message="Merhaba, salça var mı?", intent="general_question", ai_reply_draft="Merhaba! Evet, domates ve biber salçamız mevcuttur."),
            models.MessageLog(session_id="s2", raw_message="2 kavanoz domates salçası almak istiyorum", intent="new_order", ai_reply_draft="Tabii, siparişinizi hazırlıyorum. Adresinizi alabilir miyim?"),
            models.MessageLog(session_id="s3", raw_message="Kargom nerede kaldı?", intent="shipping_query", ai_reply_draft="Siparişiniz şu an yolda görünüyor."),
            models.MessageLog(session_id="s4", raw_message="Ürünler çok güzel, teşekkürler", intent="general_question", ai_reply_draft="Biz teşekkür ederiz, afiyet olsun! 🌿"),
            models.MessageLog(session_id="s5", raw_message="İade etmek istiyorum", intent="return_request", ai_reply_draft="İade talebinizi aldık, ekibimiz size ulaşacaktır.")
        ]
        db.add_all(logs)
        db.commit()

        print("Geçmiş siparişler ekleniyor...")
        order1 = models.Order(
            customer_name="Ayşe Yılmaz",
            phone="05551234567",
            city="İstanbul",
            status=models.OrderStatus.APPROVED,
            order_date=datetime.utcnow() - timedelta(days=2)
        )
        order2 = models.Order(
            customer_name="Mehmet Demir",
            phone="05329876543",
            city="Ankara",
            status=models.OrderStatus.SHIPPED,
            order_date=datetime.utcnow() - timedelta(days=5)
        )
        db.add_all([order1, order2])
        db.commit()
        item1 = models.OrderItem(order_id=order1.id, product_id=products[0].id, quantity=2)
        item2 = models.OrderItem(order_id=order1.id, product_id=products[1].id, quantity=1)
        item3 = models.OrderItem(order_id=order2.id, product_id=products[2].id, quantity=1)
        db.add_all([item1, item2, item3])
        db.commit()
        print("Başlangıç verileri başarıyla eklendi!")
    except Exception as e:
        print(f"Veri eklerken hata oluştu: {e}")
        db.rollback()
    finally:
        db.close()
if __name__ == "__main__":
    init_db()