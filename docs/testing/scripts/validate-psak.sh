#!/bin/bash
# validate-psak.sh
# W.System Finance Module — PSAK Compliance Validation
# Usage: ./validate-psak.sh [BASE_URL]

BASE="${1:-http://localhost:3001}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  PSAK Compliance Validation"
echo "  Base URL: ${BASE}"
echo "========================================"
echo ""

errors=0

# 1. Trial Balance: debit == credit
echo "[1/4] Trial Balance Equilibrium..."
tb=$(curl -s "${BASE}/api/finance/reports?type=trial-balance")
total_debit=$(echo "$tb" | jq '[.entries[].debit // 0] | add')
total_credit=$(echo "$tb" | jq '[.entries[].credit // 0] | add')
echo "    Total Debit:  ${total_debit}"
echo "    Total Credit: ${total_credit}"
if [ "$total_debit" = "$total_credit" ]; then
  echo -e "    ${GREEN}✅ PASSED: Debit = Credit${NC}"
else
  echo -e "    ${RED}❌ FAILED: Debit ≠ Credit${NC}"
  ((errors++))
fi
echo ""

# 2. Balance Sheet: Assets = Liabilities + Equity
echo "[2/4] Balance Sheet Equation..."
bs=$(curl -s "${BASE}/api/finance/reports?type=balance-sheet")
assets=$(echo "$bs" | jq '.assets.total // 0')
liab=$(echo "$bs" | jq '.liabilities.total // 0')
equity=$(echo "$bs" | jq '.equity.total // 0')
expected=$(echo "$liab + $equity" | bc)
echo "    Assets:             ${assets}"
echo "    Liabilities:        ${liab}"
echo "    Equity:             ${equity}"
echo "    L+E Expected:       ${expected}"
if [ "$assets" = "$expected" ]; then
  echo -e "    ${GREEN}✅ PASSED: Assets = L + E${NC}"
else
  echo -e "    ${RED}❌ FAILED: Assets ≠ L + E${NC}"
  ((errors++))
fi
echo ""

# 3. P&L: Revenue - Expenses = Net Income
echo "[3/4] P&L Calculation..."
pl=$(curl -s "${BASE}/api/finance/reports?type=profit-loss")
revenue=$(echo "$pl" | jq '.revenue.total // 0')
cogs=$(echo "$pl" | jq '.cogs.total // 0')
opex=$(echo "$pl" | jq '.operating_expenses.total // 0')
net=$(echo "$pl" | jq '.net_income // 0')
expected_net=$(echo "$revenue - $cogs - $opex" | bc)
echo "    Revenue:            ${revenue}"
echo "    COGS:               ${cogs}"
echo "    Operating Expenses: ${opex}"
echo "    Net Income:         ${net}"
echo "    Expected Net:       ${expected_net}"
if [ "$net" = "$expected_net" ]; then
  echo -e "    ${GREEN}✅ PASSED: P&L calculation correct${NC}"
else
  echo -e "    ${RED}❌ FAILED: P&L mismatch${NC}"
  ((errors++))
fi
echo ""

# 4. Journal only includes posted entries in reports
echo "[4/4] Posted-only Report Check..."
# Check that no draft/void entries appear in TB
has_draft=$(echo "$tb" | jq '[.entries[] | select(.status == "draft")] | length')
if [ "$has_draft" = "0" ] || [ -z "$has_draft" ]; then
  echo -e "    ${GREEN}✅ PASSED: No draft entries in reports${NC}"
else
  echo -e "    ${YELLOW}⚠️ WARNING: ${has_draft} draft entries detected in TB${NC}"
fi
echo ""

# Summary
echo "========================================"
if [ $errors -eq 0 ]; then
  echo -e "  ${GREEN}✅ ALL PSAK CHECKS PASSED${NC}"
else
  echo -e "  ${RED}❌ ${errors} PSAK CHECK(S) FAILED${NC}"
fi
echo "========================================"

exit $errors
