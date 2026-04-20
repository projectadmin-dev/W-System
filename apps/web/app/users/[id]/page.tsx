"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import { UserForm } from "@/components/user-form"
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
import { ArrowLeft, PencilIcon, UserIcon, MailIcon, PhoneIcon, BuildingIcon, BadgeIcon, CalendarIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import Link from "next/link"

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

interface UserProfile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role_id: string
  role_name: string
  department: string | null
  phone: string | null
  avatar_url: string | null
  timezone: string
  language: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<{ id: string; name: string; description: string }[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string; slug: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, rolesRes, tenantsRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch("/api/users/roles"),
          fetch("/api/users/tenants"),
        ])

        if (!userRes.ok) {
          const error = await userRes.json()
          throw new Error(error.error || "Failed to fetch user")
        }
        if (!rolesRes.ok) throw new Error("Failed to fetch roles")
        if (!tenantsRes.ok) throw new Error("Failed to fetch tenants")

        const [userData, rolesData, tenantsData] = await Promise.all([
          userRes.json(),
          rolesRes.json(),
          tenantsRes.json(),
        ])

        setUser(userData.data)
        setRoles(rolesData.data || [])
        setTenants(tenantsData.data || [])
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error((error as Error).message || "Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleEditSuccess = () => {
    setIsEditMode(false)
    // Refresh user data
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data.data))
      .catch(console.error)
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Loading user data...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => router.push("/users")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Edit Mode
  if (isEditMode) {
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/users">
                      Users
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Edit User</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
              <NavUser user={profile.user} />
            </div>
          </header>

          <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsEditMode(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
                    <p className="text-muted-foreground">{user.full_name}</p>
                  </div>
                </div>
              </div>

              {/* User Form */}
              <UserForm 
                initialData={{
                  id: user.id,
                  tenant_id: user.tenant_id,
                  full_name: user.full_name,
                  email: user.email,
                  role_id: user.role_id,
                  department: user.department,
                  phone: user.phone,
                  avatar_url: user.avatar_url,
                  timezone: user.timezone,
                  language: user.language,
                }}
                roles={roles}
                tenants={tenants}
                mode="edit"
              />

            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // View Mode
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/users">
                    Users
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{user.full_name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/users">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button onClick={() => setIsEditMode(true)}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit User
              </Button>
            </div>

            {/* User Details */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Personal details of the user</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="col-span-2 font-medium">{user.full_name}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <MailIcon className="h-4 w-4" />
                      Email
                    </div>
                    <div className="col-span-2 font-medium">{user.email}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      Phone
                    </div>
                    <div className="col-span-2 font-medium">{user.phone || "—"}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <BuildingIcon className="h-4 w-4" />
                      Department
                    </div>
                    <div className="col-span-2 font-medium">{user.department || "—"}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BadgeIcon className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Role and organization details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Role</div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="px-2 py-1">
                        {user.role_name}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Tenant</div>
                    <div className="col-span-2 font-medium">{user.tenant_id}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Timezone</div>
                    <div className="col-span-2 font-medium">{user.timezone}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Language</div>
                    <div className="col-span-2 font-medium">
                      {user.language === "id" ? "Bahasa Indonesia" : "English"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Activity & Timestamps
                  </CardTitle>
                  <CardDescription>User activity and account dates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Last Login</div>
                    <div className="col-span-2 font-medium">
                      {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Never"
                      }
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Created At</div>
                    <div className="col-span-2 font-medium">
                      {new Date(user.created_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">Updated At</div>
                    <div className="col-span-2 font-medium">
                      {new Date(user.updated_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avatar */}
              {user.avatar_url && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                    <CardDescription>User's avatar image</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-32 h-32 rounded-full object-cover border-2 border-muted"
                    />
                  </CardContent>
                </Card>
              )}

            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
