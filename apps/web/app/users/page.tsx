"use client"

import { useState, useEffect, useCallback } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import { UserTable, type User } from "@/components/user-table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { toast } from "sonner"

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [filters, setFilters] = useState({
    search: "",
    role_id: "",
    is_active: undefined as boolean | undefined,
  })

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.pageSize.toString(),
        offset: (pagination.pageIndex * pagination.pageSize).toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role_id && { role_id: filters.role_id }),
        ...(filters.is_active !== undefined && { is_active: filters.is_active.toString() }),
      })

      const response = await fetch(`/api/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await response.json()
      setUsers(result.data || [])
      setTotal(result.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [pagination, filters])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  const handleFilterChange = useCallback((newFilters: { search: string; role_id: string; is_active?: boolean }) => {
    setFilters(prev => ({
      search: newFilters.search,
      role_id: newFilters.role_id,
      is_active: newFilters.is_active,
    }))
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>User Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                  <p className="text-muted-foreground">
                    Manage system users, roles, and permissions
                  </p>
                </div>
              </div>

              {/* User Table */}
              <UserTable 
                users={users}
                total={total}
                isLoading={isLoading}
                onRefresh={fetchUsers}
                onPaginationChange={handlePaginationChange}
                onFilterChange={handleFilterChange}
              />

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
