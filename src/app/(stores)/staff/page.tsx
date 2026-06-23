'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit/logAudit' // ← ONLY NEW IMPORT

type StaffRole = 'store_owner' | 'manager' | 'cashier'

type Profile = {
  id: string
  store_id: string
  full_name: string
  email: string
  role: StaffRole
  active: boolean
  created_at: string
}

export default function StaffPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)  // ← ADD THIS
  const [staffToDelete, setStaffToDelete] = useState<Profile | null>(null)  // ← ADD THIS
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'cashier' as StaffRole
  })

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data as Profile
    }
  })

  // Get all staff in store
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', currentUser?.store_id],
    queryFn: async () => {
      if (!currentUser?.store_id) return []
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_id', currentUser.store_id)
        .eq('active', true)  // ← ADD THIS LINE
        .order('created_at', { ascending: false })
      return data as Profile[]
    },
    enabled: !!currentUser?.store_id
  })

  // Add Staff Mutation
  const addStaffMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create staff')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member added')
      
      // Log audit - AFTER DB succeeds
      logAudit(
        'CREATE',
        `Added staff: ${formData.full_name} | Role: ${formData.role} | Email: ${formData.email}`,
        'staff'
      )
      
      closeModal()
    },
    onError: (err: Error) => toast.error(err.message)
  })

  // Update Staff Mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<typeof formData> }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, ...data })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff updated')
      
      // Log audit - AFTER DB succeeds
      logAudit(
        'UPDATE',
        `Updated staff: ${editingStaff?.full_name} | Role: ${formData.role}`,
        'staff'
      )
      
      closeModal()
    },
    onError: (err: Error) => toast.error(err.message)
  })
  
  // Delete Staff Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/staff/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff deleted')
    },
    onError: (err: Error) => toast.error(err.message)
  })

  function openAddModal() {
    setEditingStaff(null)
    setFormData({ full_name: '', email: '', password: '', role: 'cashier' })
    setShowModal(true)
  }

  function openEditModal(staff: Profile) {
    setEditingStaff(staff)
    setFormData({ 
      full_name: staff.full_name, 
      email: staff.email, 
      password: '', 
      role: staff.role 
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingStaff(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingStaff) {
      updateStaffMutation.mutate({ 
        id: editingStaff.id, 
        data: { full_name: formData.full_name, role: formData.role, password: formData.password || undefined }
      })
    } else {
      addStaffMutation.mutate(formData)
    }
  }

function openDeleteModal(staff: Profile) {
    setStaffToDelete(staff)
    setShowDeleteModal(true)
  }

  function handleDeleteConfirm() {
    if (!staffToDelete) return
    deleteStaffMutation.mutate(staffToDelete.id)
    logAudit(
      'DELETE',
      `Deleted staff: ${staffToDelete.full_name} | Role: ${staffToDelete.role} | Email: ${staffToDelete.email}`,
      'staff'
    )
    setShowDeleteModal(false)
    setStaffToDelete(null)
  }

  // RBAC Logic
  function canEdit(staff: Profile): boolean {
    if (!currentUser) return false
    if (staff.id === currentUser.id) return false // Can't edit self
    if (currentUser.role === 'store_owner') return true
    if (currentUser.role === 'manager') {
      return staff.role === 'cashier' // Manager can only edit cashiers
    }
    return false
  }

  function canDelete(staff: Profile): boolean {
    if (!currentUser) return false
    if (staff.id === currentUser.id) return false // Can't delete self
    if (staff.role === 'store_owner') return false // Nobody deletes owner
    if (currentUser.role === 'store_owner') return true
    if (currentUser.role === 'manager') {
      return staff.role === 'cashier' // Manager can only delete cashiers
    }
    return false
  }

  function getAvailableRoles(): StaffRole[] {
    if (currentUser?.role === 'store_owner') return ['manager', 'cashier']
    if (currentUser?.role === 'manager') return ['cashier']
    return []
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white border-slate-200 rounded">
 <CardHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-center">
            {currentUser?.role !== 'cashier' && (
              <Button onClick={openAddModal} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'store_owner' ? 'default' : 'secondary'}>
                        {member.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit(member) && (
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(member)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(member) && (
                         <Button variant="ghost" size="sm" onClick={() => openDeleteModal(member)}>
                           <Trash2 className="h-4 w-4 text-red-600" />
                         </Button>
                        )}
                        {!canEdit(member) && !canDelete(member) && member.id !== currentUser?.id && (
                          <span className="text-xs text-slate-400 italic">No access</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

 {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff / User'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2 flex flex-col items-center w-full">
                <Label htmlFor="name" className="text-center">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="text-center placeholder:text-center"
                  placeholder="First & Last Name"
                />
              </div>

              <div className="space-y-2 flex flex-col items-center w-full">
                <Label htmlFor="email" className="text-center">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingStaff}
                  className="text-center placeholder:text-center"
                  placeholder="staff@gmail.com"
                />
                {editingStaff && <p className="text-xs text-slate-500 text-center">Email cannot be changed</p>}
              </div>

              <div className="space-y-2 flex flex-col items-center w-full">
                <Label htmlFor="password" className="text-center">
                  {editingStaff ? 'New Password' : 'Password *'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingStaff}
                  className="text-center placeholder:text-center"
                  placeholder={editingStaff ? 'Leave blank to keep current' : 'Min 6 characters'}
                />
              </div>

              <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-3 justify-center">
                  <Label htmlFor="role" className="text-sm whitespace-nowrap">Role *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select role" className="text-center" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map(role => (
                        <SelectItem key={role} value={role} className="text-center">
                          {role.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 justify-center sm:justify-center">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addStaffMutation.isPending || updateStaffMutation.isPending}
              >
                {(addStaffMutation.isPending || updateStaffMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingStaff ? 'Update' : 'Save'} Staff
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

{/* Delete Confirmation Modal */}
<Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-center text-red-600">Delete Staff Member</DialogTitle>
    </DialogHeader>
    <div className="py-4 text-center">
      <p className="text-slate-700">
        Are you sure you want to delete <span className="font-semibold">{staffToDelete?.full_name}</span>?
      </p>
      <p className="text-sm text-slate-500 mt-2">
        This action cannot be undone. Staff will lose access immediately.
      </p>
    </div>
    <DialogFooter className="flex flex-row gap-2 justify-center sm:justify-center">
      <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
        Cancel
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleDeleteConfirm}
        disabled={deleteStaffMutation.isPending}
      >
        {deleteStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Delete Staff
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </div>
  )
}