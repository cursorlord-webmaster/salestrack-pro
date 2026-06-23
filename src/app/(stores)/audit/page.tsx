'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type AuditRecord = {
  id: string
  user_full_name: string | null
  action: string
  details: string | null
  created_at: string
}

export default function AuditPage() {
  const supabase = createClient()
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single()
      setStoreId(profile?.store_id || null)
    })
  }, [supabase])

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: audits, isLoading } = useQuery({
    queryKey: ['audit_logs', storeId, selectedDate, searchQuery],
    queryFn: async () => {
      if (!storeId) return []

      let query = supabase
   .from('audit_logs')
   .select('id, user_full_name, action, details, created_at')
   .eq('store_id', storeId)
   .order('created_at', { ascending: false })

      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      query = query
   .gte('created_at', startDate.toISOString())
   .lte('created_at', endDate.toISOString())

      if (searchQuery) {
        query = query.or(
          `user_full_name.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%,details.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as AuditRecord[]
    },
    enabled:!!storeId
  })

return (
  <div className="p-6 space-y-4">
    <div className="flex gap-3 flex-wrap sm:justify-start justify-center">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-black mb-1 block text-center">Search Actions</label>
        <Input
          type="text"
          placeholder="Search by user, action, or details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-black bg-white border-gray-300 text-center placeholder:text-center"
        />
      </div>
      <div className="w-full sm:w-auto flex flex-col items-center sm:items-start">
        <label className="text-xs text-black mb-1 block text-center sm:text-left">Filter by Date</label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40 text-black bg-white border-gray-300 text-center"
        />
      </div>
    </div>

    <div className="rounded-md border bg-white overflow-x-auto">
      <div className="max-h-[600px] overflow-y-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-black font-semibold w-[180px] text-center">
                Timestamp
              </TableHead>
              <TableHead className="text-black font-semibold w-[140px] text-center">
                User
              </TableHead>
              <TableHead className="text-black font-semibold w-[120px] text-center">
                Action
              </TableHead>
              <TableHead className="text-black font-semibold text-center">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-black py-8">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : audits?.length === 0? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-black py-8">
                  No audit records for {selectedDate}
                </TableCell>
              </TableRow>
            ) : (
              audits?.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="text-black text-center whitespace-nowrap">
                    {format(new Date(audit.created_at), 'yyyy-MM-dd hh:mm:ss a')}
                  </TableCell>
                  <TableCell className="text-black text-center whitespace-nowrap">
                    {audit.user_full_name || 'System'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {audit.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-black text-center break-words">
                    {audit.details || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
)
}