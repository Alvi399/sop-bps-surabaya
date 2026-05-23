from database import SessionLocal
import models

def check_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"\n📊 Total users: {len(users)}")
        print("=" * 50)
        
        for user in users:
            print(f"\n👤 User:")
            print(f"   ID: {user.id}")
            print(f"   Email: {user.email}")
            print(f"   Name: {user.full_name}")
            print(f"   Role: {user.role}")
            print(f"   Password Hash: {user.password_hash[:50]}...")
            print(f"   Active: {user.is_active}")
        
        if len(users) == 0:
            print("\n❌ Tidak ada user di database!")
            print("   Jalankan: python create_test_user.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()