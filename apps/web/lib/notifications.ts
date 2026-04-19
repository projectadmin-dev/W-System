/**
 * Hot Lead Notification System
 * 
 * Automatically notifies Commercial team and PM when a lead becomes 'hot'
 * Sends notification via Telegram bot
 */

interface HotLeadNotification {
  leadId: string
  leadName: string
  companyName: string
  totalScore: number
  stage: string
  marketingPic?: string
  contactEmail?: string
  contactPhone?: string
}

interface TelegramMessage {
  chat_id: string
  text: string
  parse_mode: string
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string
      url: string
    }>>
  }
}

/**
 * Send hot lead notification to Commercial team and PM
 */
export async function sendHotLeadNotification(lead: HotLeadNotification) {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID // Commercial & PM group chat
    
    if (!telegramBotToken || !telegramChatId) {
      console.warn('Telegram credentials not configured. Skipping notification.')
      console.log('🔥 HOT LEAD (would notify):', lead)
      return { success: false, reason: 'credentials_missing' }
    }
    
    const message = formatHotLeadMessage(lead)
    
    const requestBody: TelegramMessage = {
      chat_id: telegramChatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📋 Create Project Brief',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/project-briefs/new?leadId=${lead.leadId}`
          },
          {
            text: '👁️ View Lead Details',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/leads/${lead.leadId}`
          }
        ]]
      }
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
      console.log('✅ Hot lead notification sent successfully:', lead.leadId)
      return { success: true, messageId: result.result.message_id }
    } else {
      console.error('Telegram API error:', result)
      return { success: false, error: result.description }
    }
  } catch (error) {
    console.error('Error sending hot lead notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Format hot lead notification message for Telegram
 */
function formatHotLeadMessage(lead: HotLeadNotification): string {
  const emoji = '🔥'
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  
  return `
${emoji} *HOT LEAD ALERT* ${emoji}

*Lead:* ${escapeHtml(lead.leadName)}
*Company:* ${escapeHtml(lead.companyName || 'N/A')}
*Score:* ${lead.totalScore}/100
*Stage:* ${lead.stage.toUpperCase()}

*Contact:*
${lead.contactEmail ? `📧 ${escapeHtml(lead.contactEmail)}` : ''}
${lead.contactPhone ? `📱 ${escapeHtml(lead.contactPhone)}` : ''}

*Marketing PIC:* ${escapeHtml(lead.marketingPic || 'N/A')}

*Time:* ${timestamp}

─────────────────────
⚡ *Action Required:*
Commercial team & PM harus segera membuat Project Brief berdasarkan lead ini.

*Approval Rules:*
• Margin ≥30% → PM approval (1 hari)
• Margin 20-30% → Commercial Director (2 hari)
• Margin 10-20% → CEO approval (3 hari)
• Margin 0-10% → CEO + CFO dual approval (5 hari)
`.trim()
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
 * Send approval notification when brief is submitted
 */
export async function sendApprovalNotification(brief: {
  id: string
  title: string
  clientName: string
  estimatedMarginPct: number
  approvalTier: string
  submittedBy: string
}) {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID
    
    if (!telegramBotToken || !telegramChatId) {
      console.warn('Telegram credentials not configured. Skipping approval notification.')
      return { success: false, reason: 'credentials_missing' }
    }
    
    const approverInfo = getApproverInfo(brief.approvalTier)
    
    const message = `
⚖️ *PROJECT BRIEF SUBMITTED FOR APPROVAL*

*Brief:* ${escapeHtml(brief.title)}
*Client:* ${escapeHtml(brief.clientName)}
*Estimated Margin:* ${brief.estimatedMarginPct.toFixed(1)}%

*Approval Required:* ${approverInfo.role}
*SLA:* ${approverInfo.sla} days

*Submitted by:* ${escapeHtml(brief.submittedBy)}

─────────────────────
${approverInfo.emoji} ${approverInfo.actionRequired}
`.trim()
    
    const requestBody: TelegramMessage = {
      chat_id: telegramChatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📄 Review Brief',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/project-briefs/${brief.id}`
          }
        ]]
      }
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
      console.log('✅ Approval notification sent:', brief.id)
      return { success: true }
    } else {
      console.error('Telegram API error:', result)
      return { success: false, error: result.description }
    }
  } catch (error) {
    console.error('Error sending approval notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get approver info based on approval tier
 */
function getApproverInfo(approvalTier: string): { role: string; sla: number; emoji: string; actionRequired: string } {
  const approvers: Record<string, { role: string; sla: number; emoji: string; actionRequired: string }> = {
    'pm': { 
      role: 'Project Manager', 
      sla: 1, 
      emoji: '👨‍💼', 
      actionRequired: 'PM approval required within 1 day' 
    },
    'commercial_director': { 
      role: 'Commercial Director', 
      sla: 2, 
      emoji: '💼', 
      actionRequired: 'Commercial Director approval required within 2 days' 
    },
    'ceo': { 
      role: 'CEO', 
      sla: 3, 
      emoji: '👔', 
      actionRequired: 'CEO approval required within 3 days' 
    },
    'ceo_cfo_dual': { 
      role: 'CEO + CFO (Dual)', 
      sla: 5, 
      emoji: '👥', 
      actionRequired: 'CEO + CFO (Arie) dual approval required within 5 days' 
    }
  }
  
  return approvers[approvalTier] || approvers['pm']
}
