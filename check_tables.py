#!/usr/bin/env python3
import requests
import re

SUPABASE_URL = "https://kcbtehpcdltvdijgsrsb.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIzMzI0MywiZXhwIjoyMDkxODA5MjQzfQ.JSbs3j8wkQhUVTLl8J_JMd_6Zat-NZRlVQr57ST-WD4"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def execute_sql(sql):
    """Execute SQL via Supabase REST API"""
    # Supabase doesn't have direct SQL execute via REST
    # We need to use the pgroll or migration endpoint
    # For now, let's check what tables exist
    pass

# Check existing tables
print("Checking existing tables...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers
)
print(f"API Response: {response.status_code}")
print(f"Response: {response.text[:500]}")
