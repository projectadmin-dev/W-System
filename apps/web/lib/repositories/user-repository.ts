import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * User Profile Schema
 * Matches: public.user_profiles table (extended with HR fields)
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
  // HR Employee Fields (extended)
  nik: z.string().nullable(),
  employee_number: z.string().nullable(),
  employment_status: z.enum(['permanent', 'contract', 'probation', 'intern', 'part_time']).nullable(),
  join_date: z.string().date().nullable(),
  resignation_date: z.string().date().nullable(),
  termination_reason: z.string().nullable(),
  position_id: z.string().uuid().nullable(),
  department_id: z.string().uuid().nullable(),
  grade_id: z.string().uuid().nullable(),
  base_salary: z.string().nullable(),
  bank_account: z.string().nullable(),
  bank_name: z.string().nullable(),
  npwp: z.string().nullable(),
  bpjs_kesehatan: z.string().nullable(),
  bpjs_ketenagakerjaan: z.string().nullable(),
  emergency_contact_name: z.string().nullable(),
  emergency_contact_phone: z.string().nullable(),
  emergency_contact_relation: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  postal_code: z.string().nullable(),
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
  // HR Employee Fields
  nik?: string
  employee_number?: string
  employment_status?: 'permanent' | 'contract' | 'probation' | 'intern' | 'part_time'
  join_date?: string
  position_id?: string
  department_id?: string
  grade_id?: string
  base_salary?: string
  bank_account?: string
  bank_name?: string
  npwp?: string
  bpjs_kesehatan?: string
  bpjs_ketenagakerjaan?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
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
  // HR Employee Fields
  nik?: string
  employee_number?: string
  employment_status?: 'permanent' | 'contract' | 'probation' | 'intern' | 'part_time'
  join_date?: string
  resignation_date?: string
  termination_reason?: string
  position_id?: string
  department_id?: string
  grade_id?: string
  base_salary?: string
  bank_account?: string
  bank_name?: string
  npwp?: string
  bpjs_kesehatan?: string
  bpjs_ketenagakerjaan?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
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
        // HR Employee Fields
        nik: input.nik || null,
        employee_number: input.employee_number || null,
        employment_status: input.employment_status || null,
        join_date: input.join_date || null,
        position_id: input.position_id || null,
        department_id: input.department_id || null,
        grade_id: input.grade_id || null,
        base_salary: input.base_salary || null,
        bank_account: input.bank_account || null,
        bank_name: input.bank_name || null,
        npwp: input.npwp || null,
        bpjs_kesehatan: input.bpjs_kesehatan || null,
        bpjs_ketenagakerjaan: input.bpjs_ketenagakerjaan || null,
        emergency_contact_name: input.emergency_contact_name || null,
        emergency_contact_phone: input.emergency_contact_phone || null,
        emergency_contact_relation: input.emergency_contact_relation || null,
        address: input.address || null,
        city: input.city || null,
        province: input.province || null,
        postal_code: input.postal_code || null,
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
