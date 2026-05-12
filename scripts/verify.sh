#!/bin/bash
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY /home/ubuntu/apps/wsystem-1/apps/web/.env.local | cut -d'=' -f2)
node /home/ubuntu/apps/wsystem-1/scripts/verify-tables.js
