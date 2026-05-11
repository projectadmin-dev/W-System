import { createAdminClient } from '@/lib/supabase-server'

export interface Entity {
  id: string
  tenant_id: string
  name: string
  code: string
  type: string
  parent_id: string | null
  status: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export async function getEntities(tenantId?: string, type?: string, status?: string) {
  const supabase = createAdminClient()
  let query = supabase.from('entities').select('*').order('created_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch entities: ${error.message}`)
  return (data || []) as Entity[]
}

export async function getEntityById(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('entities').select('*').eq('id', id).single()
  if (error) throw new Error(`Failed to fetch entity: ${error.message}`)
  return data as Entity
}

export async function createEntity(entity: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('entities').insert(entity).select().single()
  if (error) throw new Error(`Failed to create entity: ${error.message}`)
  return data as Entity
}

export async function updateEntity(id: string, updates: Partial<Omit<Entity, 'id' | 'created_at' | 'updated_at'>>) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('entities').update(updates).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update entity: ${error.message}`)
  return data as Entity
}

export async function deleteEntity(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('entities').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete entity: ${error.message}`)
  return { success: true, id }
}
