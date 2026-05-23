import bcrypt

# Hash dari database Anda
db_hash = "$2a$12$OBNpWfdBP7RvmCOA4KIDw.VrQRqkHJvbBUvp9s7oXjbGkXul7052y"
password = "Sby123456"

print("🔐 Testing bcrypt hash...")
print(f"   Password: {password}")
print(f"   Hash: {db_hash}")
print()

try:
    # Convert to bytes
    password_bytes = password.encode('utf-8')
    hash_bytes = db_hash.encode('utf-8')
    
    # Verify
    result = bcrypt.checkpw(password_bytes, hash_bytes)
    
    if result:
        print("✅ Password MATCH! Hash is correct!")
    else:
        print("❌ Password MISMATCH! Hash is wrong!")
        
except Exception as e:
    print(f"❌ Error: {e}")