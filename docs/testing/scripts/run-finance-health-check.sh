#!/bin/bash
# run-finance-health-check.sh
# W.System Finance Module — Quick Health Check
# Usage: ./run-finance-health-check.sh [BASE_URL]

BASE="${1:-http://localhost:3001}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  W.System Finance Health Check"
echo "  Base URL: ${BASE}"
echo "========================================"
echo ""

endpoints=(
  "/api/finance/coa:COA"
  "/api/finance/journal:Journal Entries"
  "/api/finance/periods:Fiscal Periods"
  "/api/finance/customer-invoices:Customer Invoices"
  "/api/finance/vendor-bills:Vendor Bills"
  "/api/finance/payments:Payments"
  "/api/finance/receipts:Receipts"
  "/api/finance/reports?type=profit-loss:Reports P&L"
  "/api/finance/reports?type=balance-sheet:Reports BS"
  "/api/finance/reports?type=trial-balance:Reports TB"
  "/api/finance/transactions:Transactions Hub"
  "/api/finance/expenses:Expenses"
  "/api/finance/cash-register:Cash Register"
  "/api/finance/petty-cash:Petty Cash"
  "/api/finance/money-requests:Money Requests"
  "/api/finance/ar-aging:AR Aging"
  "/api/finance/ap-aging:AP Aging"
)

pass=0
fail=0

for item in "${endpoints[@]}"; do
  ep="${item%%:*}"
  name="${item##*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${ep}")
  if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅${NC} ${name} (${ep}) → HTTP ${status}"
    ((pass++))
  else
    echo -e "${RED}❌${NC} ${name} (${ep}) → HTTP ${status}"
    ((fail++))
  fi
done

echo ""
echo "========================================"
echo -e "  Result: ${GREEN}${pass} PASS${NC} / ${RED}${fail} FAIL${NC}"
echo "========================================"

exit $fail
