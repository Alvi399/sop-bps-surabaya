from database import test_connection, engine
from sqlalchemy import text

def main():
    print("🔄 Testing MySQL connection...")
    
    # Test 1: Simple connection
    if test_connection():
        print("\n✅ Connection test passed!")
    else:
        print("\n❌ Connection test failed!")
        return
    
    # Test 2: Show database info
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT DATABASE()"))
            db_name = result.fetchone()[0]
            print(f"📊 Connected to database: {db_name}")
            
            result = conn.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            print(f"🔧 MySQL version: {version}")
            
            result = conn.execute(text("SHOW TABLES"))
            tables = result.fetchall()
            print(f"📋 Tables in database: {len(tables)}")
            for table in tables:
                print(f"   - {table[0]}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()