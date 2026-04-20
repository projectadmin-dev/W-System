import { NextResponse } from 'next/server'
import { userRepository } from '@/lib/repositories/user-repository'

/**
 * GET /api/users/roles - Get all available roles
 */
export async function GET() {
  try {
    const roles = await userRepository.getRoles()
    
    return NextResponse.json({
      data: roles,
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles', message: (error as Error).message },
      { status: 500 }
    )
  }
}
