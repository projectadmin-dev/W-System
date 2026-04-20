import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * User Profile Schema
 * Matches: public.user_profiles table
 */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  entity_id: z.string().uuid().nullable(),
  full_name: z.string().min(1),
  email: z.string().email(),
  role_id: z.string().uuid(),
  role_name: z.string().optional(),
  department: z.string().nullable(),
  phone: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  timezone: z.string().default('Asia/Jakarta'),
  language: z.string().default('id'),
  preferences: z.record(z.unknown()).default({}),
  is_active: z.boolean().default(true),
  last_login_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
})

export type UserProfile = z.infer<typeof userProfileSchema>

/**
 * User List Response with Pagination
 */
export interface UserListResponse {
  data: UserProfile[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * User Filters for search and filtering
 */
export interface UserFilters {
  search?: string
  role_id?: string
  is_active?: boolean
  tenant_id?: string
  limit?: number
  offset?: number
}

/**
 * Create User Input
 */
export interface CreateUserInput {
  tenant_id: string
  full_name: string
  email: string
  role_id: string
  department?: string
  phone?: string
  avatar_url?: string
  timezone?: string
  language?: string
  preferences?: Record<string, unknown>
}

/**
 * Update User Input
 */
export interface UpdateUserInput {
  full_name?: string
  email?: string
  role_id?: string
  department?: string
  phone?: string
  avatar_url?: string
  timezone?: string
  language?: string
  preferences?: Record<string, unknown>
  is_active?: boolean
}

/**
 * User Repository
 * 
 * Data access layer for user_profiles table.
 * All queries respect RLS policies.
 * 
 * RLS Policy Summary (from ALL_MIGRATIONS_COMBINED.sql):
 * - Users can view/update their own profile
 * - Admin roles (admin, super_admin) can manage all profiles in their tenant
 * - Privileged roles can view tenant profiles for assignment UI
 */
export class UserRepository {
  /**
   * Get list of users with pagination and filters
   */
  async list(filters: UserFilters = {}): Promise<UserListResponse> {
    const supabase = await createServerClient()
    
    const {
      search = '',
      role_id,
      is_active,
      tenant_id,
      limit = 50,
      offset = 0,
    } = filters

    // Build query
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        role_name:roles!inner(name)
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (role_id) {
      query = query.eq('role_id', role_id)
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active)
    }
    
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('UserRepository.list error:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    // Transform data to include role_name at top level
    const transformedData = (data || []).map((user) => ({
      ...user,
      role_name: (user as any).role_name?.[0]?.name || 'Unknown',
    }))

    return {
      data: transformedData as UserProfile[],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    }
  }

  /**
   * Get single user by ID
   */
  async getById(id: string): Promise<UserProfile | null> {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        role_name:roles!inner(name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found
        return null
      }
      console.error('UserRepository.getById error:', error)
      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return {
      ...data,
      role_name: (data as any).role_name?.[0]?.name || 'Unknown',
    } as UserProfile
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string, tenant_id?: string): Promise<UserProfile | null> {
    const supabase = await createServerClient()

    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        role_name:roles!inner(name)
      `)
      .eq('email', email)

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('UserRepository.getByEmail error:', error)
      throw new Error(`Failed to fetch user by email: ${error.message}`)
    }

    return {
      ...data,
      role_name: (data as any).role_name?.[0]?.name || 'Unknown',
    } as UserProfile
  }

  /**
   * Create new user
   * Note: This creates a profile, not an auth user.
   * For auth user creation, use Supabase Admin API.
   */
  async create(input: CreateUserInput): Promise<UserProfile> {
    const supabase = await createAdminClient()

    // Check for duplicate email in tenant
    const existing = await this.getByEmail(input.email, input.tenant_id)
    if (existing) {
      throw new Error(`User with email ${input.email} already exists in this tenant`)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        tenant_id: input.tenant_id,
        full_name: input.full_name,
        email: input.email,
        role_id: input.role_id,
        department: input.department,
        phone: input.phone,
        avatar_url: input.avatar_url,
        timezone: input.timezone || 'Asia/Jakarta',
        language: input.language || 'id',
        preferences: input.preferences || {},
        is_active: true,
      })
      .select(`
        *,
        role_name:roles!inner(name)
      `)
      .single()

    if (error) {
      console.error('UserRepository.create error:', error)
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return {
      ...data,
      role_name: (data as any).role_name?.[0]?.name || 'Unknown',
    } as UserProfile
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<UserProfile> {
    const supabase = await createServerClient()

    // Check for duplicate email if email is being updated
    if (input.email) {
      const existing = await this.getByEmail(input.email)
      if (existing && existing.id !== id) {
        throw new Error(`User with email ${input.email} already exists`)
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        role_name:roles!inner(name)
      `)
      .single()

    if (error) {
      console.error('UserRepository.update error:', error)
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return {
      ...data,
      role_name: (data as any).role_name?.[0]?.name || 'Unknown',
    } as UserProfile
  }

  /**
   * Soft delete user (set deleted_at)
   */
  async delete(id: string): Promise<void> {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('UserRepository.delete error:', error)
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }

  /**
   * Get all roles for dropdown/selection
   */
  async getRoles(): Promise<{ id: string; name: string; description: string }[]> {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('name')

    if (error) {
      console.error('UserRepository.getRoles error:', error)
      throw new Error(`Failed to fetch roles: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all tenants for dropdown/selection (admin only)
   */
  async getTenants(): Promise<{ id: string; name: string; slug: string }[]> {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('UserRepository.getTenants error:', error)
      throw new Error(`Failed to fetch tenants: ${error.message}`)
    }

    return data || []
  }
}

// Export singleton instance
export const userRepository = new UserRepository()
