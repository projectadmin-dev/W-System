#!/usr/bin/env node

/**
 * SLA Monitor Cron Job
 * 
 * Runs every hour to check for SLA breaches
 * Execute: node scripts/sla-monitor-cron.js
 */

import { checkSLABreaches } from '../lib/sla-monitor.js'

async function main() {
  console.log('🔍 Starting SLA Monitor check...')
  console.log('Timestamp:', new Date().toISOString())
  console.log('---')
  
  const result = await checkSLABreaches()
  
  console.log('---')
  console.log('✅ SLA Monitor completed')
  console.log('Result:', JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('❌ SLA Monitor failed:', error)
  process.exit(1)
})
