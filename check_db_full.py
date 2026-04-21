#!/usr/bin/env python3
import requests
import json

SUPABASE_URL = "https://kcbtehpcdltvdijgsrsb.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzMzI0MywiZXhwIjoyMDkxODA5MjQzfQ.JSbs3j8wkQhUVTLl8J_JMd_6Zat-NZRlVQr57ST-WD4"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("=" * 70)
print("🔍 CHECKING DATABASE TABLES - SUPABASE")
print("=" * 70)

# Get all tables
print("\n📊 Fetching all tables...")
response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)

if response.status_code == 200:
    spec = response.json()
    paths = spec.get('paths', {})
    tables = [p.strip('/') for p in paths.keys() if p.startswith('/') and len(p) > 1]
    print(f"✅ Found {len(tables)} tables")
    
    # User-related tables
    user_tables = [t for t in tables if 'user' in t.lower() or 'profile' in t.lower() or 'role' in t.lower()]
    print(f"\n📋 USER-RELATED TABLES ({len(user_tables)}):")
    for t in sorted(user_tables):
        print(f"   ✓ {t}")
    
    # Fetch user_profiles
    print("\n" + "=" * 70)
    print("📊 USER_PROFILES DATA")
    print("=" * 70)
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=50",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Total users: {len(data)}")
        
        if data:
            # Group by role
            by_role = {}
            for u in data:
                role = u.get('role_id', 'N/A')
                if role not in by_role:
                    by_role[role] = []
                by_role[role].append(u)
            
            print(f"\n📊 Users by role: {len(by_role)} roles")
            
            # Show sample
            print("\n📋 Sample users (first 15):")
            for i, u in enumerate(data[:15], 1):
                print(f"   {i}. {u.get('full_name', 'N/A'):25} | {u.get('email', 'N/A'):35} | {u.get('department', 'N/A')}")
        else:
            print("\n⚠️ No users found in user_profiles table")
    else:
        print(f"❌ Error: {response.status_code} - {response.text[:200]}")
    
    # Check tenants
    print("\n" + "=" * 70)
    print("📊 TENANTS & ENTITIES")
    print("=" * 70)
    
    response = requests.get(f"{SUPABASE_URL}/rest/v1/tenants?select=*", headers=headers)
    if response.status_code == 200:
        tenants = response.json()
        print(f"\n✅ Tenants: {len(tenants)}")
        for t in tenants:
            print(f"   - {t.get('name', 'N/A')} (ID: {t.get('id', 'N/A')[:8]}...)")
    
    response = requests.get(f"{SUPABASE_URL}/rest/v1/entities?select=*", headers=headers)
    if response.status_code == 200:
        entities = response.json()
        print(f"\n✅ Entities: {len(entities)}")
        for e in entities:
            print(f"   - {e.get('name', 'N/A')} ({e.get('type', 'N/A')})")
    
    # Check roles
    print("\n" + "=" * 70)
    print("📊 ROLES")
    print("=" * 70)
    
    response = requests.get(f"{SUPABASE_URL}/rest/v1/roles?select=*", headers=headers)
    if response.status_code == 200:
        roles = response.json()
        print(f"\n✅ Roles: {len(roles)}")
        for r in roles:
            print(f"   - {r.get('name', 'N/A')}")
    
else:
    print(f"❌ Failed: {response.status_code}")
    print(f"Response: {response.text[:500]}")

print("\n" + "=" * 70)
print("✅ CHECK COMPLETE")
print("=" * 70)
