#!/bin/bash
# Finance Module Blackbox QAQC - Systematic Check
# Target: http://43.153.224.59:3001

BASE_URL="http://43.153.224.59:3001"
REPORT_FILE="/tmp/finance-qaqc-report.txt"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

> "$REPORT_FILE"

log() {
  echo "$1" | tee -a "$REPORT_FILE"
}

log "=============================================="
log "FINANCE MODULE BLACKBOX QAQC REPORT"
log "Target: $BASE_URL"
log "Date: $(date)"
log "=============================================="
log ""

# Finance Pages to check
PAGES=(
  "/finance"
  "/finance/coa"
  "/finance/journal"
  "/finance/journal/new"
  "/finance/periods"
  "/finance/reports"
  "/finance/reports/trial-balance"
  "/finance/reports/balance-sheet"
  "/finance/reports/profit-loss"
  "/finance/reports/cash-flow-statement"
  "/finance/ap-aging"
  "/finance/ar-aging"
  "/finance/customer-invoices"
  "/finance/customers"
  "/finance/vendor-bills"
  "/finance/vendors"
  "/finance/expenses"
  "/finance/payments"
  "/finance/payment-vouchers"
  "/finance/receipts"
  "/finance/petty-cash"
  "/finance/bank-reconciliation"
  "/finance/payment-reconciliation"
  "/finance/budget-vs-actual"
  "/finance/cash-register"
  "/finance/money-requests"
  "/finance/transactions"
)

# API endpoints to check
APIS=(
  "GET:/api/finance"
  "GET:/api/finance/coa"
  "GET:/api/finance/journal"
  "POST:/api/finance/journal"
  "GET:/api/finance/periods"
  "POST:/api/finance/periods"
  "GET:/api/finance/reports"
  "GET:/api/finance/reports/trial-balance"
  "GET:/api/finance/reports/balance-sheet"
  "GET:/api/finance/reports/profit-loss"
  "GET:/api/finance/reports/cash-flow-statement"
  "GET:/api/finance/ap-aging"
  "GET:/api/finance/ar-aging"
  "GET:/api/finance/customer-invoices"
  "GET:/api/finance/vendor-bills"
  "GET:/api/finance/vendors"
  "GET:/api/finance/customers"
  "GET:/api/finance/expenses"
  "GET:/api/finance/payments"
  "GET:/api/finance/payment-vouchers"
  "GET:/api/finance/petty-cash"
  "GET:/api/finance/bank-reconciliation"
  "GET:/api/finance/receipts"
  "GET:/api/finance/money-requests"
)

log "=== PAGE LOAD TESTS ==="
for page in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL$page" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    log -e "${GREEN}✓${NC} $page → HTTP $STATUS"
  elif [ "$STATUS" = "307" ] || [ "$STATUS" = "308" ]; then
    REDIRECT=$(curl -s -o /dev/null -w "%{redirect_url}" --max-time 10 "$BASE_URL$page" 2>/dev/null)
    log -e "${YELLOW}↪${NC} $page → HTTP $STATUS (redirect to: $REDIRECT)"
  elif [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    log -e "${YELLOW}🔒${NC} $page → HTTP $STATUS (auth required - OK)"
  else
    log -e "${RED}✗${NC} $page → HTTP $STATUS"
  fi
done

log ""
log "=== API ENDPOINT TESTS ==="
for api in "${APIS[@]}"; do
  METHOD="${api%%:*}"
  ENDPOINT="${api##*:}"
  if [ "$METHOD" = "GET" ]; then
    STATUS=$(curl -s -o /tmp/api_response_$$.txt -w "%{http_code}" --max-time 10 -H "Content-Type: application/json" "$BASE_URL$ENDPOINT" 2>/dev/null)
    BODY=$(cat /tmp/api_response_$$.txt 2>/dev/null | head -c 200)
  else
    STATUS=$(curl -s -o /tmp/api_response_$$.txt -w "%{http_code}" --max-time 10 -X "$METHOD" -H "Content-Type: application/json" -d '{}' "$BASE_URL$ENDPOINT" 2>/dev/null)
    BODY=$(cat /tmp/api_response_$$.txt 2>/dev/null | head -c 200)
  fi
  
  if [ "$STATUS" = "200" ]; then
    log -e "${GREEN}✓${NC} $METHOD $ENDPOINT → HTTP $STATUS"
  elif [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
    log -e "${YELLOW}⚠${NC} $METHOD $ENDPOINT → HTTP $STATUS | Body: $BODY"
  elif [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    log -e "${YELLOW}🔒${NC} $METHOD $ENDPOINT → HTTP $STATUS (auth required)"
  elif [ "$STATUS" = "500" ]; then
    log -e "${RED}✗${NC} $METHOD $ENDPOINT → HTTP $STATUS | Body: $BODY"
  elif [ "$STATUS" = "000" ]; then
    log -e "${RED}✗${NC} $METHOD $ENDPOINT → TIMEOUT/UNREACHABLE"
  else
    log -e "${YELLOW}?${NC} $METHOD $ENDPOINT → HTTP $STATUS | Body: $BODY"
  fi
  rm -f /tmp/api_response_$$.txt
done

log ""
log "=== PAGE TITLE CHECKS ==="
for page in "${PAGES[@]}"; do
  TITLE=$(curl -s --max-time 10 "$BASE_URL$page" 2>/dev/null | grep -o '<title>[^<]*</title>' | head -c 100)
  if [ -n "$TITLE" ]; then
    log "  $page → $TITLE"
  fi
done

log ""
log "=============================================="
log "QAQC Report Generated: $REPORT_FILE"
log "=============================================="
