#!/bin/bash
# SLA Monitor Cron Script
# Runs every hour to check for SLA breaches

cd /home/ubuntu/apps/wsystem-1

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Run SLA monitor
npm run sla-monitor >> /home/ubuntu/logs/sla-monitor.log 2>&1
