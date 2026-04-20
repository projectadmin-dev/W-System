import { NextRequest, NextResponse } from 'next/server'
import { userRepository, UserFilters } from '@/lib/repositories/user-repository'

/**
 * GET /api/users - List all users
 * Query params: search, role_id, is_active, tenant_id, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const filters: UserFilters = {
      search: searchParams.get('search') || undefined,
      role_id: searchParams.get('role_id') || undefined,
      is_active: searchParams.get('is_active') 
        ? searchParams.get('is_active') === 'true' 
        : undefined,
      tenant_id: searchParams.get('tenant_id') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    }

    const result = await userRepository.list(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users - Create new user
 * Body: { tenant_id, full_name, email, role_id, department?, phone?, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['tenant_id', 'full_name', 'email', 'role_id']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          fields: missingFields 
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const user = await userRepository.create({
      tenant_id: body.tenant_id,
      full_name: body.full_name,
      email: body.email,
      role_id: body.role_id,
      department: body.department,
      phone: body.phone,
      avatar_url: body.avatar_url,
      timezone: body.timezone,
      language: body.language,
      preferences: body.preferences,
    })

    return NextResponse.json({
      message: 'User created successfully',
      data: user,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    
    // Handle duplicate email error
    if ((error as Error).message.includes('already exists')) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create user', message: (error as Error).message },
      { status: 500 }
    )
  }
}
