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

print("=" * 80)
print("📊 USER_PROFILES TABLE - FULL STRUCTURE & DATA ANALYSIS")
print("=" * 80)

# Get table structure via RPC or information_schema
print("\n📋 1. TABLE STRUCTURE (user_profiles)")
print("-" * 80)

# Fetch one user to see all fields
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=1",
    headers=headers
)

if response.status_code == 200:
    data = response.json()
    if data:
        user = data[0]
        print(f"\n✅ Fields in user_profiles ({len(user)} fields):")
        for key, value in user.items():
            value_str = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
            print(f"   • {key:25} : {value_str} ({type(value).__name__})")
else:
    print(f"❌ Error: {response.status_code}")

# Fetch all 50 users for analysis
print("\n" + "=" * 80)
print("📊 2. COMPLETE USER DATA (50 users)")
print("=" * 80)

response = requests.get(
    f"{SUPABASE_URL}/rest/v1/user_profiles?select=*&order=full_name.asc",
    headers=headers
)

if response.status_code == 200:
    users = response.json()
    print(f"\n✅ Total: {len(users)} users\n")
    
    # Analyze fields
    print("📋 FIELD ANALYSIS:")
    print("-" * 80)
    
    # Check which fields are populated
    field_stats = {}
    for user in users:
        for key, value in user.items():
            if key not in field_stats:
                field_stats[key] = {'filled': 0, 'empty': 0, 'values': set()}
            if value is None or value == '':
                field_stats[key]['empty'] += 1
            else:
                field_stats[key]['filled'] += 1
                if isinstance(value, (str, int, bool)):
                    field_stats[key]['values'].add(str(value)[:30])
    
    print(f"\n{'Field':<25} | {'Filled':<8} | {'Empty':<8} | {'Sample Values'}")
    print("-" * 80)
    for field, stats in sorted(field_stats.items()):
        sample = list(stats['values'])[:3] if stats['values'] else ['(none)']
        print(f"{field:<25} | {stats['filled']:<8} | {stats['empty']:<8} | {', '.join(sample)}")
    
    # Group by department
    print("\n" + "=" * 80)
    print("📊 3. USERS BY DEPARTMENT")
    print("=" * 80)
    
    by_dept = {}
    for u in users:
        dept = u.get('department', 'N/A') or 'NULL'
        if dept not in by_dept:
            by_dept[dept] = []
        by_dept[dept].append(u)
    
    for dept, dept_users in sorted(by_dept.items()):
        print(f"\n{dept}: {len(dept_users)} users")
        for u in dept_users[:5]:
            print(f"   - {u.get('full_name', 'N/A')} ({u.get('email', 'N/A')})")
        if len(dept_users) > 5:
            print(f"   ... and {len(dept_users) - 5} more")
    
    # Group by role
    print("\n" + "=" * 80)
    print("📊 4. USERS BY ROLE_ID")
    print("=" * 80)
    
    # Get role names
    role_map = {}
    response = requests.get(f"{SUPABASE_URL}/rest/v1/roles?select=id,name", headers=headers)
    if response.status_code == 200:
        roles = response.json()
        role_map = {r['id']: r['name'] for r in roles}
    
    by_role = {}
    for u in users:
        role_id = u.get('role_id', 'N/A')
        if role_id not in by_role:
            by_role[role_id] = []
        by_role[role_id].append(u)
    
    for role_id, role_users in sorted(by_role.items()):
        role_name = role_map.get(role_id, 'Unknown') if role_id != 'N/A' else 'N/A'
        print(f"\n{role_name} ({role_id}): {len(role_users)} users")
        for u in role_users[:3]:
            print(f"   - {u.get('full_name', 'N/A')}")
        if len(role_users) > 3:
            print(f"   ... and {len(role_users) - 3} more")
    
    # Check HC-relevant fields
    print("\n" + "=" * 80)
    print("📊 5. HC MODULE RELEVANCE CHECK")
    print("=" * 80)
    
    hc_fields = ['nik', 'employee_number', 'position_id', 'department_id', 'join_date', 
                 'employment_status', 'salary_grade', 'phone', 'date_of_birth', 'gender',
                 'address', 'city', 'province', 'postal_code', 'emergency_contact', 
                 'emergency_phone', 'bank_account', 'bank_name', 'tax_id', 'bpjs_number']
    
    print("\n🔍 HC-relevant fields availability:")
    for field in hc_fields:
        if field in field_stats:
            filled = field_stats[field]['filled']
            print(f"   ✓ {field:<25} : {filled}/50 filled")
        else:
            print(f"   ❌ {field:<25} : FIELD NOT EXISTS")
    
    print("\n" + "=" * 80)
    print("⚠️  RECOMMENDATION FOR HC MODULE")
    print("=" * 80)
    
    missing_hc_fields = [f for f in hc_fields if f not in field_stats]
    if missing_hc_fields:
        print(f"\n📋 Missing HC fields ({len(missing_hc_fields)}):")
        for f in missing_hc_fields[:15]:
            print(f"   - {f}")
        if len(missing_hc_fields) > 15:
            print(f"   ... and {len(missing_hc_fields) - 15} more")
        
        print("\n💡 Suggestion: Create migration to extend user_profiles OR create hr_employees table")
    else:
        print("\n✅ All HC fields exist!")
    
else:
    print(f"❌ Error: {response.status_code}")
    print(f"Response: {response.text[:500]}")

print("\n" + "=" * 80)
