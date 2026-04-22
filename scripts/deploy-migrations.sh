#!/bin/bash

# Deploy Payroll Migrations to Supabase
# Usage: ./scripts/deploy-migrations.sh

set -e

echo "🚀 Deploying Payroll Migrations to Supabase..."
echo ""

# Read DATABASE_URL from .env.local
cd /home/ubuntu/apps/wsystem-1/apps/web
DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d'=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env.local"
    exit 1
fi

echo "✅ Found DATABASE_URL"
echo ""

# Combine migration files
echo "📝 Combining migration files..."
cat \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220001_allowance_types.sql \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220002_employee_allowances.sql \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220003_thr_configs.sql \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220004_pro_rate_configs.sql \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220005_allowance_calculation_logs.sql \
  /home/ubuntu/apps/wsystem-1/supabase/migrations/202604220006_payroll_slips_extend.sql \
  > /tmp/payroll-deploy.sql

echo "✅ Combined SQL ready"
echo ""

# Extract password from DATABASE_URL
# Format: postgresql://user:password@host:port/db
DB_HOST=$(echo $DATABASE_URL | sed 's|.*@||' | cut -d'/' -f1 | cut -d':' -f1)
DB_PORT=$(echo $DATABASE_URL | sed 's|.*@||' | cut -d'/' -f1 | cut -d':' -f2)
DB_USER=$(echo $DATABASE_URL | sed 's|postgresql://||' | cut -d':' -f1)
DB_PASS=$(echo $DATABASE_URL | sed 's|postgresql://[^:]*:||' | cut -d'@' -f1)
DB_NAME=$(echo $DATABASE_URL | sed 's|.*/||')

echo "🔗 Connecting to Supabase..."
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Run migrations via psql
echo "⚙️  Executing migrations..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f /tmp/payroll-deploy.sql \
  --set ON_ERROR_STOP=on

echo ""
echo "✅ Migrations deployed successfully!"
echo ""

# Verify tables
echo "🔍 Verifying tables..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "\dt public.allowance*" \
  -c "\dt public.employee_allowances" \
  -c "\dt public.thr_*" \
  -c "\dt public.pro_rate_*" \
  -c "\dt public.allowance_calculation_logs"

echo ""
echo "✅ Deployment complete!"
