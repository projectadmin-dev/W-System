#!/usr/bin/env python3
import requests
import json

SUPABASE_URL = "https://kcbtehpcdltvdijgsrsb.supabase.co"
# Full service role key from vercel.json
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdyc3IiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ0NzYzNDM3LCJleHAiOjIwNjAzMzk0Mzd9.Q7mN8pL3xR5tK9wY2vH6jZ4aB1cD8eF0gI2hJ3kL5mN"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("=" * 60)
print("🔍 CHECKING USER-RELATED TABLES IN SUPABASE")
print("=" * 60)

# Check user_profiles table
print("\n📊 1. Checking user_profiles table...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=5",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   Total rows: {len(data)}")
    if data:
        print(f"   Sample data:")
        for row in data[:3]:
            print(f"      - {row.get('full_name', 'N/A')} ({row.get('email', 'N/A')})")
else:
    print(f"   Error: {response.text[:200]}")

# Check auth.users count (via RPC if available, or skip)
print("\n📊 2. Checking roles table...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/roles?select=*&limit=10",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   Available roles:")
    for row in data:
        print(f"      - {row.get('name', 'N/A')}")
else:
    print(f"   Error: {response.text[:200]}")

# Check tenants table
print("\n📊 3. Checking tenants table...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/tenants?select=*&limit=5",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   Total tenants: {len(data)}")
    for row in data:
        print(f"      - {row.get('name', 'N/A')} (ID: {row.get('id', 'N/A')[:8]}...)")
else:
    print(f"   Error: {response.text[:200]}")

# Check entities table
print("\n📊 4. Checking entities table...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/entities?select=*&limit=5",
    headers=headers
)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   Total entities: {len(data)}")
    for row in data:
        print(f"      - {row.get('name', 'N/A')}")
else:
    print(f"   Error: {response.text[:200]}")

print("\n" + "=" * 60)
print("✅ CHECK COMPLETE")
print("=" * 60)
