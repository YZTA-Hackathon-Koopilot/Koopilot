from database import SessionLocal
import models
from datetime import datetime, timedelta
import random

def populate_demo_data():
    db = SessionLocal()
    try:
        # 1. Ensure Products exist
        products = db.query(models.Product).all()
        if not products:
            # If no products, add some dummy ones
            categories = ["Bakliyat", "Süt Ürünleri", "Yağlar", "Soslar"]
            for i in range(10):
                p = models.Product(
                    name=f"Örnek Ürün {i+1}",
                    category=random.choice(categories),
                    price=float(random.randint(50, 500)),
                    stock=float(random.randint(10, 100)),
                    unit="Adet",
                    description="Demo ürünü açıklaması"
                )
                db.add(p)
            db.commit()
            products = db.query(models.Product).all()

        # 1.5. Add some "stale" products that have NO sales (for non-sellers insight)
        stale_products = [
            ("Organik Nar Ekşisi (500ml)", "Soslar", 245.0, 15.0),
            ("Çiçek Balı (850g)", "Süt Ürünleri", 380.0, 12.0),
            ("Köy Tipi Domates Salçası", "Soslar", 120.0, 45.0)
        ]
        for name, cat, price, stock in stale_products:
            p = models.Product(name=name, category=cat, price=price, stock=stock, unit="Adet", description="Özel üretim")
            db.add(p)
        db.commit()
        # Re-fetch products including stale ones
        products = db.query(models.Product).all()
        # We use datetime.now() because backend uses date.today() which is local
        now = datetime.now()
        
        messages = [
            ("Merhaba, elinizde salça var mı?", "stock_check"),
            ("2 kavanoz bal ve 1 litre zeytinyağı almak istiyorum", "new_order"),
            ("Siparişim ne zaman gelir?", "shipping_query"),
            ("Zeytinyağı fiyatlarınız nedir?", "price_inquiry"),
            ("İyi günler, kolay gesin", "greeting"),
            ("Balın içeriği nedir, doğal mı?", "product_info"),
            ("Kargo takip numarası alabilir miyim?", "shipping_query"),
            ("Domates salçası acı mı?", "product_info"),
            ("10 kavanoz salça için indirim yapar mısınız?", "price_inquiry"),
            ("Yeni sipariş oluşturmak istiyorum", "new_order")
        ]

        # Add 40-60 random logs for today
        for _ in range(50):
            msg, intent = random.choice(messages)
            log = models.MessageLog(
                session_id=f"demo_session_{random.randint(1, 100)}",
                raw_message=msg,
                intent=intent,
                ai_reply_draft="AI Örnek Cevap",
                created_at=now - timedelta(minutes=random.randint(0, 600))
            )
            db.add(log)

        # 3. Add Orders for the last 7 days (for Insights)
        customers = ["Ahmet Yılmaz", "Elif Demir", "Mehmet Kaya", "Ayşe Yıldız", "Can Özkan", "Selin Aras"]
        cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"]
        
        for i in range(20):
            order_date = now - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))
            order = models.Order(
                customer_name=random.choice(customers),
                phone=f"0555{random.randint(100, 999)}{random.randint(10, 99)}{random.randint(10, 99)}",
                city=random.choice(cities),
                status=models.OrderStatus.APPROVED,
                order_date=order_date,
                shipping_status="Teslim Edildi" if random.random() > 0.3 else "Yolda"
            )
            db.add(order)
            db.flush() 

            # Add 1-3 items per order
            selected_products = random.sample(products, random.randint(1, 3))
            for p in selected_products:
                item = models.OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    quantity=float(random.randint(1, 5))
                )
                db.add(item)

        # 4. Ensure some products have low stock
        critical_products = random.sample(products, 2)
        for p in critical_products:
            p.stock = float(random.randint(1, 4))

        db.commit()
        print("Demo verileri başarıyla (yerel saatle) eklendi!")
    except Exception as e:
        print(f"Hata: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_demo_data()
