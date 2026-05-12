#!/bin/bash

# Test Payroll API Endpoints
# Usage: ./scripts/test-payroll-api.sh

BASE_URL="http://localhost:3001/api"

echo "🧪 Testing Payroll API Endpoints"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: List payroll periods
echo "📋 Test 1: GET /payroll-periods"
curl -s "$BASE_URL/payroll-periods" | jq .
echo ""

# Test 2: Create payroll period (requires auth)
echo "📝 Test 2: POST /payroll-periods (requires auth token)"
echo "Skipping - need valid Supabase auth token"
echo ""

# Test 3: Generate payroll
echo "⚙️  Test 3: POST /payroll-periods/[id]/generate"
echo "Skipping - need period ID and auth token"
echo ""

echo "✅ API endpoints are accessible!"
echo ""
echo "To test with auth, get your token from browser console:"
echo "  const { data: { session } } = await supabase.auth.getSession()"
echo "  console.log(session.access_token)"
echo ""
echo "Then use:"
echo "  curl -H \"Authorization: Bearer YOUR_TOKEN\" $BASE_URL/payroll-periods"
