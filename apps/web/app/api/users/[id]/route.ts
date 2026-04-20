import { NextRequest, NextResponse } from 'next/server'
import { userRepository, UpdateUserInput } from '@/lib/repositories/user-repository'

/**
 * GET /api/users/[id] - Get single user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await userRepository.getById(id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: user,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/[id] - Update user
 * Body: { full_name?, email?, role_id?, department?, phone?, ... }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await userRepository.getById(id)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Build update object with only provided fields
    const updateData: UpdateUserInput = {}
    
    const allowedFields = [
      'full_name', 'email', 'role_id', 'department', 
      'phone', 'avatar_url', 'timezone', 'language', 
      'preferences', 'is_active'
    ]
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as any)[field] = body[field]
      }
    }

    // Validate at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const user = await userRepository.update(id, updateData)

    return NextResponse.json({
      message: 'User updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    
    // Handle duplicate email error
    if ((error as Error).message.includes('already exists')) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update user', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id] - Soft delete user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await userRepository.getById(id)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent self-deletion (optional security measure)
    // You can add logic here to check if the current user is deleting themselves

    await userRepository.delete(id)

    return NextResponse.json({
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', message: (error as Error).message },
      { status: 500 }
    )
  }
}
