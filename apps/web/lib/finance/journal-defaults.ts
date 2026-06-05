/**
 * Default COA resolution for journal automation.
 * Used as a fallback when a source document hasn't (yet) specified an explicit
 * account via the UI pickers, so auto-journals still post balanced. Finance can
 * override per document; these defaults keep the books moving in the meantime.
 */

export const DEFAULT_REVENUE_CODE = '4-40000-1' // Project Based - Project Revenue
export const DEFAULT_CASH_CODE = '1-10002' // Bank
export const AP_CONTROL_CODE = '2-10100' // Hutang Usaha

export async function getCoaIdByCode(
  db: any,
  tenantId: string,
  accountCode: string,
): Promise<string | null> {
  const { data } = await db
    .from('coa')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_code', accountCode)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

/** First active expense account — fallback for AP items missing a coa_id. */
export async function getDefaultExpenseCoaId(db: any, tenantId: string): Promise<string | null> {
  const { data } = await db
    .from('coa')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_type', 'expense')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('account_code', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}
