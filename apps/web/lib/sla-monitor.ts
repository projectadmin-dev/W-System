/**
 * SLA Breach Monitor & Alert System
 * 
 * Checks leads approaching or past SLA deadline
 * Sends alerts to responsible PIC via Telegram
 * 
 * Usage: Run every hour via cron
 * - Approaching (< 24h): Warning alert
 * - Breached: Critical alert + escalation
 */

interface LeadWithSLA {
  id: string
  name: string
  company_name: string
  stage: string
  sla_deadline_at: string
  sla_breached: boolean
  current_pic?: {
    full_name: string
    email: string
  }
  marketing_pic?: {
    full_name: string
    email: string
  }
}

interface TelegramMessage {
  chat_id: string
  text: string
  parse_mode: string
}

/**
 * Check all leads for SLA breaches and approaching deadlines
 * Returns summary of actions taken
 */
export async function checkSLABreaches() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (!telegramBotToken || !telegramChatId) {
      console.warn('Telegram credentials not configured. Skipping SLA monitoring.')
      return { success: false, reason: 'credentials_missing' }
    }

    // Create Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    const warningThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now

    // Fetch leads with SLA concerns (not breached but approaching, or already breached)
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        current_pic:user_profiles!current_pic_id (
          full_name,
          email
        ),
        marketing_pic:user_profiles!marketing_pic_id (
          full_name,
          email
        )
      `)
      .eq('deleted_at', null)
      .neq('stage', 'deal') // Exclude deals
      .or(`sla_breached.eq.true,sla_deadline_at.lte.${warningThreshold}`)
      .order('sla_deadline_at', { ascending: true })

    if (error) {
      console.error('Error fetching leads for SLA check:', error)
      return { success: false, error: error.message }
    }

    if (!leads || leads.length === 0) {
      console.log('✅ No SLA breaches or approaching deadlines found')
      return { success: true, checked: 0, warned: 0, breached: 0 }
    }

    let warned = 0
    let breached = 0

    for (const lead of leads as LeadWithSLA[]) {
      if (lead.sla_breached) {
        // Already breached - send critical alert
        await sendBreachAlert(lead, 'critical')
        breached++
      } else if (new Date(lead.sla_deadline_at) <= new Date(warningThreshold)) {
        // Approaching deadline (< 24h) - send warning
        await sendBreachAlert(lead, 'warning')
        warned++
      }
    }

    console.log(`✅ SLA Monitor complete: ${leads.length} leads checked, ${warned} warnings, ${breached} breached`)
    
    return {
      success: true,
      checked: leads.length,
      warned,
      breached
    }
  } catch (error) {
    console.error('Error in SLA breach monitor:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send SLA breach or warning alert to Telegram
 */
async function sendBreachAlert(lead: LeadWithSLA, type: 'warning' | 'critical') {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN!
    const telegramChatId = process.env.TELEGRAM_CHAT_ID!

    const message = formatBreachMessage(lead, type)

    const requestBody: TelegramMessage = {
      chat_id: telegramChatId,
      text: message,
      parse_mode: 'HTML'
    }

    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    )

    const result = await response.json()

    if (result.ok) {
      console.log(`✅ SLA ${type} alert sent for lead:`, lead.id)
      
      // If breached and not yet marked, update database
      if (type === 'critical' && !lead.sla_breached) {
        await markLeadAsBreached(lead.id)
      }
      
      return { success: true }
    } else {
      console.error('Telegram API error:', result)
      return { success: false, error: result.description }
    }
  } catch (error) {
    console.error('Error sending SLA breach alert:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Format SLA breach/warning message for Telegram
 */
function formatBreachMessage(lead: LeadWithSLA, type: 'warning' | 'critical'): string {
  const emoji = type === 'warning' ? '⚠️' : '🚨'
  const urgencyText = type === 'warning' ? 'SLA DEADLINE APPROACHING' : 'SLA BREACHED'
  
  const deadline = new Date(lead.sla_deadline_at)
  const now = new Date()
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  let timeInfo: string
  if (type === 'warning') {
    timeInfo = `⏰ Time Remaining: ${hoursLeft > 0 ? `${Math.floor(hoursLeft)} hours` : 'Less than 1 hour!'}`
  } else {
    const hoursOverdue = Math.abs(hoursLeft)
    timeInfo = `⏰ Overdue By: ${Math.floor(hoursOverdue)} hours`
  }

  const timestamp = now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  return `
${emoji} *${urgencyText}* ${emoji}

*Lead:* ${escapeHtml(lead.name)}
*Company:* ${escapeHtml(lead.company_name || 'N/A')}
*Stage:* ${lead.stage.toUpperCase()}
*Current PIC:* ${escapeHtml(lead.current_pic?.full_name || 'Unassigned')}

${timeInfo}
*Deadline:* ${deadline.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

*Marketing PIC:* ${escapeHtml(lead.marketing_pic?.full_name || 'N/A')}

─────────────────────
⚡ *Action Required:*
${type === 'warning' 
  ? 'Segera lakukan follow-up untuk menghindari SLA breach!'
  : 'SLA sudah breached! Escalate ke Marketing Lead / Commercial Director segera!'
}

*Time:* ${timestamp}
`.trim()
}

/**
 * Mark lead as breached in database
 */
async function markLeadAsBreached(leadId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('leads')
      .update({
        sla_breached: true,
        sla_breached_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      console.error('Error marking lead as breached:', error)
    } else {
      console.log('✅ Lead marked as breached:', leadId)
    }
  } catch (error) {
    console.error('Error in markLeadAsBreached:', error)
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * CLI entry point for cron job
 */
if (typeof window === 'undefined' && process.argv[1]?.includes('sla-monitor')) {
  checkSLABreaches().then(result => {
    console.log('SLA Monitor Result:', result)
    process.exit(result.success ? 0 : 1)
  })
}
