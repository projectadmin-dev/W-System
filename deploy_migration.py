#!/usr/bin/env python3
import requests

SUPABASE_URL = "https://kcbtehpcdltvdijgsrsb.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzMzI0MywiZXhwIjoyMDkxODA5MjQzfQ.JSbs3j8wkQhUVTLl8J_JMd_6Zat-NZRlVQr57ST-WD4"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Read migration files in order
migration_files = [
    "/home/ubuntu/apps/wsystem-1/supabase/migrations/20260418_001_create_core_tenants.sql",
    "/home/ubuntu/apps/wsystem-1/supabase/migrations/20260418_005_create_identity_profiles.sql",
]

for migration_file in migration_files:
    print(f"\n{'='*60}")
    print(f"Executing: {migration_file}")
    print('='*60)
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    # Execute via Supabase REST API
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        json={"sql": sql}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Success!")
    else:
        print(f"❌ Error: {response.text[:500]}")
