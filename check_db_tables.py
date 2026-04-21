#!/usr/bin/env python3
import requests
import json

SUPABASE_URL = "https://kcbtehpcdltvdijgsrsb.supabase.co"
# Full service role key from .env.local
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdyc3IiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ0NzYzNDM3LCJleHAiOjIwNjAzMzk0Mzd9.Q7mN8pL3xR5tK9wY2vH6jZ4aB1cD8eF0gI2hJ3kL5mN"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("=" * 70)
print("🔍 CHECKING DATABASE TABLES VIA SUPABASE REST API")
print("=" * 70)

# Get all tables from OpenAPI spec
print("\n📊 Fetching all available tables from Supabase REST API...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers
)

if response.status_code == 200:
    spec = response.json()
    paths = spec.get('paths', {})
    tables = [p.strip('/') for p in paths.keys() if p.startswith('/') and len(p) > 1]
    
    print(f"\n✅ Found {len(tables)} tables/endpoints:")
    print("-" * 70)
    
    # Filter user-related tables
    user_tables = [t for t in tables if 'user' in t.lower() or 'profile' in t.lower() or 'role' in t.lower() or 'tenant' in t.lower()]
    
    print("\n📋 USER-RELATED TABLES:")
    for table in user_tables:
        print(f"   ✓ {table}")
    
    print("\n📋 ALL TABLES:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    # Fetch data from user_profiles
    print("\n" + "=" * 70)
    print("📊 FETCHING USER_PROFILES DATA...")
    print("=" * 70)
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=20",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Total users: {len(data)}")
        if data:
            print("\n📋 Sample users:")
            for i, row in enumerate(data[:10], 1):
                print(f"   {i}. {row.get('full_name', 'N/A')} - {row.get('email', 'N/A')} ({row.get('department', 'N/A')})")
    else:
        print(f"   ❌ Error: {response.status_code}")
        print(f"   {response.text[:200]}")
        
else:
    print(f"❌ Failed to fetch tables: {response.status_code}")
    print(f"Response: {response.text[:500]}")

print("\n" + "=" * 70)
