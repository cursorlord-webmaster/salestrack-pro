// src/app/(store)/inventory/page.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, NotebookPen, Trash2, Loader2, PencilLine } from "lucide-react"
import { logAudit } from '@/lib/audit/logAudit'
import { getVerticalConfig, RETAIL_VERTICALS } from "@/lib/verticals"

type Product = {
  id: string
  name: string
  category_id: string | null
  category?: string | null
  barcode: string | null
  quantity: number
  minimum_stock: number
  cost_price: number
  selling_price: number
  base_unit: string
  pack_size: number
  pack_name: string
  pack_cost_price: number | null
  pack_selling_price: number | null
  supplier: string | null
  description: string | null
  store_id: string
  created_at: string
}

type Settings = {
  low_stock_threshold: number
}

type InventoryItem = Product & {
  unit_cost: number
  unit_price: number
  margin: number
  isLowStock: boolean
  total_cost_value: number
  total_selling_value: number
}

type Category = {
  id: string
  name: string
}

function formatStock(quantity: number, unit: string, verticalKey?: string | null) {
  if (!unit) return `${quantity}`
  const lower = unit.toLowerCase()
  const config = getVerticalConfig(verticalKey)
  const plural = config.pluralMap[lower]
  if (quantity === 1) {
    return `${quantity} ${unit}`
  }
  return `${quantity} ${plural || unit + 's'}`
}

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([])
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([])
  const [settings, setSettings] = useState<Settings>({ low_stock_threshold: 10 })
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState("")
  const [storeId, setStoreId] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
const [profile, setProfile] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [storeVertical, setStoreVertical] = useState<string | null>(null)
  const [savingVertical, setSavingVertical] = useState(false)
  const [pendingVertical, setPendingVertical] = useState<string | null>(null);
  // --- Damage/Theft surgical ---
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustType, setAdjustType] = useState<"damage" | "theft" | "correction" | "adjustment">("damage")
  const [adjustQty, setAdjustQty] = useState(1)
  const [adjustReason, setAdjustReason] = useState("")
  const [adjustResponsible, setAdjustResponsible] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    filterInventory()
  }, [searchTerm, categoryFilter, inventoryData])

  async function loadInventory() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/client-login')
      return
    }

    const { data: profile } = await supabase
   .from('profiles')
   .select('role, store_id')
   .eq('id', user.id)
   .single()

    if (!profile?.store_id) {
      setLoading(false)
      return
    }

    setUserRole(profile.role)
    setStoreId(profile.store_id)

    // Fetch store vertical selection
    const { data: storeData } = await supabase
      .from('stores')
      .select('vertical')
      .eq('id', profile.store_id)
      .single()

    if (storeData?.vertical) {
      setStoreVertical(storeData.vertical)
    }

    const { data: settingsData } = await supabase
   .from('store_settings')
   .select('low_stock_threshold')
   .eq('store_id', profile.store_id)
   .single()

    if (settingsData) setSettings(settingsData)

    const { data: catsData } = await supabase
   .from('categories')
   .select('id, name')
   .eq('store_id', profile.store_id)
   .order('name')

    if (catsData) setCategories(catsData)

const { data: products } = await supabase
   .from('products')
   .select(`
        *,
        category:categories(name)
      `)
   .eq('store_id', profile.store_id)
   .eq('active', true)  // ADD THIS LINE - Hide archived products
   .order('name')

    if (!products) {
      setLoading(false)
      return
    }

    const processed = products.map(product => {
      const unit_cost = product.cost_price || 0
      const unit_price = product.selling_price || 0
      const margin = unit_price > 0? ((unit_price - unit_cost) / unit_price * 100) : 0
      const isLowStock = product.quantity <= (product.minimum_stock || settingsData?.low_stock_threshold || 10)
      const total_cost_value = product.quantity * unit_cost
      const total_selling_value = product.quantity * unit_price

      return {
    ...product,
        category: product.category?.name || categories.find(c => c.id === product.category_id)?.name || null,
        unit_cost: Number(unit_cost.toFixed(2)),
        unit_price: Number(unit_price.toFixed(2)),
        margin: Number(margin.toFixed(1)),
        isLowStock,
        total_cost_value,
        total_selling_value
      }
    })

    setInventoryData(processed)
    setFilteredData(processed)
    setLoading(false)
  }

  function filterInventory() {
    const filtered = inventoryData.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter
      return matchSearch && matchCategory
    })
    setFilteredData(filtered)
  }

  function canPerformAction(action: string) {
    const permissions: Record<string, string[]> = {
      store_owner: ['create', 'read', 'update', 'delete'],
      manager: ['create', 'read', 'update', 'delete'],
      cashier: ['read'],
      sales: ['read']
    }
    return permissions[userRole]?.includes(action) || false
  }

async function getOrCreateCategory(categoryName: string): Promise<string | null> {
  if (!categoryName || !storeId) return null

  const { data: existing, error: selectError } = await supabase
   .from('categories')
   .select('id')
   .eq('name', categoryName)
   .eq('store_id', storeId)
   .maybeSingle()

  if (selectError) {
    console.error('Category select failed:', selectError)
    return null
  }

  if (existing) return existing.id

  const { data: newCat, error } = await supabase
   .from('categories')
   .insert({ name: categoryName, store_id: storeId })
   .select('id')
   .single()

  if (error) {
    console.error('Category creation failed:', error)
    return null
  }
  return newCat.id
}

// Step A: Triggered when user clicks 'Select' on a card
  function handleInitiateVerticalSelect(verticalKey: string) {
    setPendingVertical(verticalKey);
  }

  // Step B: Triggered when user clicks 'Yes, Confirm' on the guardrail pop-up
  async function handleConfirmVerticalSave() {
    if (!pendingVertical || !storeId) return;

    try {
      setSavingVertical(true);

      const { error } = await supabase
        .from("stores")
        .update({ vertical: pendingVertical })
        .eq("id", storeId);

      if (error) throw error;

      setStoreVertical(pendingVertical);
      setPendingVertical(null);
      toast.success("Store category initialized successfully");
    } catch (err: any) {
      console.error("Error saving store vertical:", err);
      toast.error("Failed to save store retail category", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setSavingVertical(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const packSize = parseInt(formData.get('pack_size') as string) || 1
    const packCostPrice = parseFloat(formData.get('pack_cost_price') as string)
    const packQty = parseInt(formData.get('purchase_qty') as string)

    const totalBaseUnits = packQty * packSize
    const unitCostPrice = packCostPrice / packSize
    const unitSellingPrice = parseFloat(formData.get('unit_selling_price') as string)
    const packSellingPrice = parseFloat(formData.get('pack_selling_price') as string) || 0
    const categoryName = formData.get('category') as string
    const categoryId = await getOrCreateCategory(categoryName)

    const product = {
      store_id: storeId,
      name: formData.get('name') as string,
      category_id: categoryId,
      barcode: formData.get('barcode') as string || null,
      quantity: totalBaseUnits,
      minimum_stock: parseInt(formData.get('minimum_stock') as string) || 10,
      cost_price: unitCostPrice,
      selling_price: unitSellingPrice,
      base_unit: formData.get('base_unit') as string,
      pack_size: packSize,
      pack_name: formData.get('pack_name') as string,
      pack_cost_price: packCostPrice,
      pack_selling_price: packSellingPrice,
      supplier: formData.get('supplier') as string || null,
      description: formData.get('description') as string || null,
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()

    if (error || !newProduct) {
      toast.error("Failed to add product", { description: error?.message })
      return
    }

    // === NEW: Log IN movement for initial purchase ===
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('inventory_movements').insert({
      store_id: storeId,
      product_id: newProduct.id,
      movement_type: 'purchase',
      quantity: totalBaseUnits,
      reason: 'PURCHASE',
      created_by: user?.id || null
    })

    logAudit("CREATE", `Added product: ${product.name}, Stock: ${product.quantity} ${product.base_unit} | ID: ${newProduct.id}`, "inventory").catch(e =>
      console.error('Audit failed:', e)
    )
    toast.success("Product added successfully - IN movement logged")
    setShowAddModal(false)
    setTimeout(() => loadInventory(), 100)
  }

  async function handleUpdateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedProduct) return

    const formData = new FormData(e.currentTarget)

    const packSize = parseInt(formData.get('pack_size') as string) || 1
    const packCostPrice = parseFloat(formData.get('pack_cost_price') as string)
    const packQty = parseInt(formData.get('purchase_qty') as string)

    const totalBaseUnits = packQty * packSize
    const unitCostPrice = packCostPrice / packSize
    const unitSellingPrice = parseFloat(formData.get('unit_selling_price') as string)
    const packSellingPrice = parseFloat(formData.get('pack_selling_price') as string) || 0
    const categoryName = formData.get('category') as string
    const categoryId = await getOrCreateCategory(categoryName)

    const oldQty = selectedProduct.quantity
    const diff = totalBaseUnits - oldQty // positive = restock, negative = manual reduction

    const updated = {
      name: formData.get('name') as string,
      category_id: categoryId,
      barcode: formData.get('barcode') as string || null,
      quantity: totalBaseUnits,
      minimum_stock: parseInt(formData.get('minimum_stock') as string),
      cost_price: unitCostPrice,
      selling_price: unitSellingPrice,
      base_unit: formData.get('base_unit') as string,
      pack_size: packSize,
      pack_name: formData.get('pack_name') as string,
      pack_cost_price: packCostPrice,
      pack_selling_price: packSellingPrice,
      supplier: formData.get('supplier') as string || null,
      description: formData.get('description') as string || null
    }

    const { error } = await supabase
      .from('products')
      .update(updated)
      .eq('id', selectedProduct.id)

    if (error) {
      toast.error("Failed to update product", { description: error.message })
      return
    }

    // === NEW: Log movement if quantity changed ===
    if (diff !== 0) {
      const { data: { user } } = await supabase.auth.getUser()
      const movementType = diff > 0 ? 'purchase' : 'adjustment'
      const reason = diff > 0 ? 'RESTOCK' : 'ADJUSTMENT'
      await supabase.from('inventory_movements').insert({
        store_id: storeId,
        product_id: selectedProduct.id,
        movement_type: movementType,
        quantity: Math.abs(diff),
        reason: reason,
        created_by: user?.id || null
      })
    }

    logAudit("UPDATE", `Updated product: ${selectedProduct.name} | ID: ${selectedProduct.id}`, "inventory").catch(e =>
      console.error('Audit failed:', e)
    )
    toast.success("Product updated successfully")
    setShowEditModal(false)
    setSelectedProduct(null)
    loadInventory()
  }

async function handleDeleteProduct() {
  if (!selectedProduct) return

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    toast.error("Session expired. Please login again.")
    return
  }

  // SOFT DELETE: Archive instead of hard delete
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', selectedProduct.id)

  if (error) {
    toast.error("Failed to archive product", { description: error.message })
    return
  }

  // Audit log
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('store_id, full_name')
    .eq('id', user.id)
    .single()

  if (currentProfile) {
    await supabase.from('audit_logs').insert({
      store_id: currentProfile.store_id,
      user_id: user.id,
      user_full_name: currentProfile.full_name,
      action: 'ARCHIVE',
      entity: 'product',
      details: `Archived product: ${selectedProduct.name} | ID: ${selectedProduct.id} | Barcode: ${selectedProduct.barcode || 'N/A'}`,
      created_at: new Date().toISOString()
    })
  }

  toast.success("Product archived successfully")
  setShowDeleteModal(false)
  setSelectedProduct(null)
  loadInventory()
}

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct || adjustQty <= 0) return
    if (adjustQty > selectedProduct.quantity) {
      toast.error(`Cannot remove ${adjustQty}, only ${selectedProduct.quantity} in stock`)
      return
    }
    setAdjusting(true)
    const fullReason = `${adjustType.toUpperCase()}: ${adjustReason} | Responsible: ${adjustResponsible || 'N/A'} | Before:${selectedProduct.quantity} After:${Math.max(0, selectedProduct.quantity - adjustQty)}`
    
    const { error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: selectedProduct.id,
      p_qty: adjustQty,
      p_type: adjustType,
      p_reason: fullReason
    })

    if (error) {
      toast.error("Adjust failed", { description: error.message })
      setAdjusting(false)
      return
    }

    logAudit("ADJUST", `${adjustType} ${adjustQty}x ${selectedProduct.name} | ${fullReason}`, "inventory").catch(()=>{})
    toast.success(`${adjustType} logged: -${adjustQty} ${selectedProduct.name}`)
    setShowAdjustModal(false)
    setAdjusting(false)
    setAdjustReason("")
    setAdjustResponsible("")
    loadInventory()
  }

  function formatNaira(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

if (loading) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center text-center space-y-5">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800">
            Securely retrieving stock levels, inventory records and total products …
          </h2>
        </div>
      </div>
    </div>
  )
}

  const uniqueCategories = [...new Set(inventoryData.map(p => p.category).filter(Boolean) as string[])]

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 rounded">
        <CardHeader className="border-b border-slate-200">
          <div className="space-y-4">
            <CardTitle className="text-xl font-semibold text-slate-900 text-center">
              Total Products In Stock
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-3 justify-center items-center">
              <Input
                placeholder="Search products or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 text-center bg-white border-slate-300"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white border-slate-300">
                  <SelectValue placeholder="All Categories" className="text-center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-center">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-center">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canPerformAction('create') && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white rounded w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-700 text-center max-w-">Product Name</TableHead>
                  <TableHead className="text-slate-700 text-center">Category</TableHead>
                  <TableHead className="text-slate-700 text-center">Stock</TableHead>
                  <TableHead className="text-slate-700 text-center">Unit Cost</TableHead>
                  <TableHead className="text-slate-700 text-center">Unit Price</TableHead>
                  <TableHead className="text-slate-700 text-center">Profit %</TableHead>
                  <TableHead className="text-slate-700 text-center">Supplier</TableHead>
                  <TableHead className="text-slate-700 text-center">Status</TableHead>
                  <TableHead className="text-slate-700 text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0? filteredData.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`border-slate-100 ${item.isLowStock? 'bg-red-50' : ''}`}
                  >
                    <TableCell className="font-medium text-slate-900 text-center max-w- truncate" title={item.name}>{item.name}</TableCell>
                    <TableCell className="text-slate-600 text-center max-w- truncate" title={item.category || ''}>{item.category || '-'}</TableCell>
<TableCell className="text-slate-900 text-center font-semibold">
  {formatStock(item.quantity, item.base_unit, storeVertical)}
</TableCell>
                    <TableCell className="text-slate-600 text-center">
                      {formatNaira(item.unit_cost)}/{item.base_unit}
                    </TableCell>
                    <TableCell className="text-slate-900 text-center">
                      {formatNaira(item.unit_price)}/{item.base_unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.margin < 0? (
                        <Badge variant="destructive" className="rounded">Loss {item.margin}%</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 rounded">{item.margin}%</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-center">{item.supplier || '-'}</TableCell>
                    <TableCell className="text-center">
                      {item.isLowStock? (
                        <Badge className="rounded bg-red-600 hover:bg-red-600 text-white font-medium">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 rounded font-medium">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="flex gap-1 justify-center">
                        {canPerformAction('update') && (
                          <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(item)
                              setShowEditModal(true)
                            }}
                            className="rounded"
                            title="Edit"
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(item)
                              setAdjustType("damage")
                              setAdjustQty(1)
                              setShowAdjustModal(true)
                            }}
                            className="rounded border-amber-300 text-amber-700 hover:bg-amber-50"
                            title="Damage / Theft / Correction"
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          </>
                        )}
                        {canPerformAction('delete') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item)
                              setShowDeleteModal(true)
                            }}
                            className="rounded bg-red-600 hover:bg-red-700 text-white border-0"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden p-4 space-y-4">
            {filteredData.length > 0? filteredData.map((item) => (
              <Card key={item.id} className={`bg-white border-slate-200 rounded ${item.isLowStock? 'bg-red-50' : ''}`}>
                <CardContent className="p-4 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                    <p className="text-sm text-slate-600">{item.category || '-'}</p>
                    {item.isLowStock? (
                      <Badge variant="destructive" className="rounded">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 rounded">In Stock</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Stock</span>
                      <span className="text-slate-900 font-semibold">{formatStock(item.quantity, item.base_unit, storeVertical)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Unit Cost</span>
                      <span className="text-slate-900">{formatNaira(item.unit_cost)}/{item.base_unit}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Unit Price</span>
                      <span className="text-slate-900">{formatNaira(item.unit_price)}/{item.base_unit}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Profit</span>
                      {item.margin < 0? (
                        <Badge variant="destructive" className="rounded">Loss {item.margin}%</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 rounded">{item.margin}%</Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Supplier</span>
                      <span className="text-slate-900">{item.supplier || '-'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center pt-3 border-t border-slate-200">
                        {canPerformAction('update') && (
                          <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(item)
                              setShowEditModal(true)
                            }}
                            className="rounded h-7 w-7 p-0"
                            title="Edit"
                          >
                            <NotebookPen className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(item)
                              setAdjustType("damage")
                              setAdjustQty(1)
                              setShowAdjustModal(true)
                            }}
                            className="rounded h-7 w-7 p-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                            title="Damage / Theft"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </Button>
                          </>
                        )}
                    {canPerformAction('delete') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item)
                              setShowDeleteModal(true)
                            }}
                            className="rounded h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white border-0"
                            title="Archive"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                          </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center text-slate-500 py-8">No products found</div>
            )}
          </div>
        </CardContent>
      </Card>

<Dialog open={showAddModal} onOpenChange={setShowAddModal}>
<DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto top-[5vh] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          {!storeVertical ? (
            <div className="p-4 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-red-600 text-center text-xl font-bold">Important Notice</DialogTitle>
              </DialogHeader>
              <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-slate-700 leading-relaxed">
                Please choose your business type carefully below. The category you select will be saved to your store profile and <strong>cannot be changed later.</strong> Ensure that it is the correct category for your business type before clicking the <strong>'Select'</strong> button. If you are not sure which one to choose, please contact SalesTrack Pro Support via our official WhatsApp on +234-903-598-4646 for instant guidance before you select or proceed.
              </div>

              <div className="relative">
                {/* 2-Column Vertical Selection Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.values(RETAIL_VERTICALS).map((vertical) => (
                    <div
                      key={vertical.id}
                      className="aspect-square p-3 bg-[#0f172a] text-white rounded-lg shadow-sm border border-slate-800 flex flex-col justify-between items-center text-center transition-transform duration-150 hover:border-slate-600"
                    >
                      <div className="my-auto space-y-1">
                        <h4 className="font-semibold text-xs text-white text-center leading-tight">{vertical.label}</h4>
                        <p className="text-[9.5px] leading-tight text-slate-300 text-center line-clamp-4 font-normal tracking-tight px-0.5">{vertical.description}</p>
                      </div>
                      
                      <Button
                        type="button"
                        disabled={savingVertical || pendingVertical !== null}
                        onClick={() => handleInitiateVerticalSelect(vertical.id)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium text-[11px] py-1 h-7 rounded border border-slate-600/40 transition-colors shadow-xs"
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Confirmation Guardrail Pop-up Overlay */}
                {pendingVertical && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 rounded-lg z-50">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full text-center space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 text-base">Confirm Business Type</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Are you sure you want to select <span className="font-semibold text-slate-900">"{RETAIL_VERTICALS[pendingVertical]?.label}"</span>? This action is permanent and configures your store's inventory categories.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          disabled={savingVertical}
                          onClick={() => setPendingVertical(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs h-9 rounded-lg border border-slate-300 transition-colors"
                        >
                          No, Go Back
                        </Button>
                        <Button
                          type="button"
                          disabled={savingVertical}
                          onClick={handleConfirmVerticalSave}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-lg transition-colors shadow-xs"
                        >
                          {savingVertical ? "Saving..." : "Yes, Confirm"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <DialogHeader>
                <DialogTitle className="text-slate-900 text-center">Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 text-center block">Product Name *</Label>
                  <Input id="name" name="name" required className="bg-white border-slate-300 text-center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 text-center block">Category *</Label>
                  <Select name="category" required>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="select item category" />
                    </SelectTrigger>
                       <SelectContent>
                      {getVerticalConfig(storeVertical).categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-slate-700 text-center block">Barcode</Label>
                  <Input id="barcode" name="barcode" className="bg-white border-slate-300 text-center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-slate-700 text-center block">Supplier</Label>
                  <Input id="supplier" name="supplier" className="bg-white border-slate-300 text-center" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 pt-2 text-center">How You Buy From Supplier</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_qty" className="text-slate-700 text-center block">Qty Bought *</Label>
                  <Input id="purchase_qty" name="purchase_qty" type="number" required defaultValue="1" className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. 10 cartons, bags</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack_name" className="text-slate-700 text-center block">Pack Name *</Label>
                  <Input id="pack_name" name="pack_name" required defaultValue="carton" className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. carton, bag, crate</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack_size" className="text-slate-700 text-center block">Units Per Pack *</Label>
                  <Input id="pack_size" name="pack_size" type="number" required defaultValue="1" className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. 20 per carton</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack_cost_price" className="text-slate-700 text-center block">Cost Per Pack *</Label>
                  <Input id="pack_cost_price" name="pack_cost_price" type="number" step="0.01" required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. ₦3000/carton</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 pt-2 text-center">How You Sell To Customers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_unit" className="text-slate-700 text-center block">Sell By *</Label>
                  <Select name="base_unit" defaultValue="piece" required>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                      <SelectContent>
                      {getVerticalConfig(storeVertical).unitOptions.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {getVerticalConfig(storeVertical).pluralMap[unit] || unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 text-center">e.g. piece, cup, kg</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_selling_price" className="text-slate-700 text-center block">Price Per Unit *</Label>
                  <Input id="unit_selling_price" name="unit_selling_price" type="number" step="0.01" required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. ₦200/piece</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack_selling_price" className="text-slate-700 text-center block">Price Per Pack</Label>
                  <Input id="pack_selling_price" name="pack_selling_price" type="number" step="0.01" defaultValue="0" className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">e.g. ₦4000/carton (0=disable)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock" className="text-slate-700 text-center block">Reorder Level</Label>
                  <Input id="minimum_stock" name="minimum_stock" type="number" defaultValue="10" className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">Notify when reduced to (In base units)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 text-center block">Description</Label>
                  <Input id="description" name="description" className="bg-white border-slate-300 text-center" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-xs text-slate-600 text-center">
                  System will auto-calculate: Total stock units, cost per unit, profit margins
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded">
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white rounded">
                Save Product
              </Button>
            </DialogFooter>
            </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
		<DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto top-[5vh] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-center">Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-slate-700 text-center block">Product Name *</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedProduct?.name} required className="bg-white border-slate-300 text-center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 text-center block">Category *</Label>
                  <Select name="category" required>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="select item category" />
                    </SelectTrigger>
                        <SelectContent>
                      {getVerticalConfig(storeVertical).categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-barcode" className="text-slate-700 text-center block">Barcode</Label>
                  <Input id="edit-barcode" name="barcode" defaultValue={selectedProduct?.barcode || ''} className="bg-white border-slate-300 text-center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier" className="text-slate-700 text-center block">Supplier</Label>
                  <Input id="edit-supplier" name="supplier" defaultValue={selectedProduct?.supplier || ''} className="bg-white border-slate-300 text-center" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 pt-2 text-center">How You Buy From Supplier</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-purchase_qty" className="text-slate-700 text-center block">Qty Bought *</Label>
                  <Input
                    id="edit-purchase_qty"
                    name="purchase_qty"
                    type="number"
                    defaultValue={selectedProduct? Math.floor(selectedProduct.quantity / (selectedProduct.pack_size || 1)) : 1}
                    required
                    className="bg-white border-slate-300 text-center"
                  />
                  <p className="text-xs text-slate-500 text-center">e.g. 10 cartons</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pack_name" className="text-slate-700 text-center block">Pack Name *</Label>
                  <Input id="edit-pack_name" name="pack_name" defaultValue={selectedProduct?.pack_name || 'carton'} required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">carton, bag, crate</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pack_size" className="text-slate-700 text-center block">Units Per Pack *</Label>
                  <Input id="edit-pack_size" name="pack_size" type="number" defaultValue={selectedProduct?.pack_size || 1} required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">20 per carton</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pack_cost_price" className="text-slate-700 text-center block">Cost Per Pack *</Label>
                  <Input id="edit-pack_cost_price" name="pack_cost_price" type="number" step="0.01" defaultValue={selectedProduct?.pack_cost_price || ''} required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">₦3000/carton</p>
                </div>
              </div>

               <h3 className="text-sm font-semibold text-slate-900 pt-2 text-center">How You Sell To Customers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="edit-base_unit" className="text-slate-700 text-center block">Sell By *</Label>
                  <Select name="base_unit" defaultValue={selectedProduct?.base_unit || 'piece'} required>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getVerticalConfig(storeVertical).unitOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {getVerticalConfig(storeVertical).pluralMap[unit] || unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 text-center">piece, cup, kg</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit_selling_price" className="text-slate-700 text-center block">Price Per Unit *</Label>
                  <Input id="edit-unit_selling_price" name="unit_selling_price" type="number" step="0.01" defaultValue={selectedProduct?.selling_price || ''} required className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">₦200/piece</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pack_selling_price" className="text-slate-700 text-center block">Price Per Pack</Label>
                  <Input id="edit-pack_selling_price" name="pack_selling_price" type="number" step="0.01" defaultValue={selectedProduct?.pack_selling_price || 0} className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">₦4000/carton (0=disable)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-minimum_stock" className="text-slate-700 text-center block">Reorder Level</Label>
                  <Input id="edit-minimum_stock" name="minimum_stock" type="number" defaultValue={selectedProduct?.minimum_stock || 10} className="bg-white border-slate-300 text-center" />
                  <p className="text-xs text-slate-500 text-center">In base units</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-slate-700 text-center block">Description</Label>
                  <Input id="edit-description" name="description" defaultValue={selectedProduct?.description || ''} className="bg-white border-slate-300 text-center" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-xs text-slate-600 text-center">
                  System will auto-calculate: Total stock units, cost per unit, profit margins
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="rounded">
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white rounded">
                Update Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <div className="text-center">
              <div className="text-6xl mb-4">⚠</div>
              <DialogTitle className="text-red-600 text-center">Delete Product?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center text-slate-600 py-4">
  This will archive <strong>{selectedProduct?.name}</strong> from inventory. 
  It will be hidden from POS and Inventory, but all its sales history will be preserved in your store database.
</div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="rounded">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} className="rounded">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
	  
	        {/* --- SURGICAL: Damage/Theft/Correction Modal --- */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Adjust Stock — {selectedProduct?.name}</DialogTitle>
            <p className="text-center text-sm text-slate-500">Current: {selectedProduct ? formatStock(selectedProduct.quantity, selectedProduct.base_unit, storeVertical) : '-'}</p>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-center block">Type *</Label>
                <Select value={adjustType} onValueChange={(v:any)=>setAdjustType(v)}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-center block">Qty to Remove *</Label>
                <Input type="number" min={1} max={selectedProduct?.quantity || 1} value={adjustQty} onChange={e=>setAdjustQty(parseInt(e.target.value)||1)} required className="text-center bg-white border-slate-300" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-center block">Reason / Note *</Label>
              <Input value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="e.g. 5 bottles broken during offload" required className="bg-white border-slate-300 text-center" />
            </div>
            <div className="space-y-2">
              <Label className="text-center block">Responsible Person</Label>
              <Input value={adjustResponsible} onChange={e=>setAdjustResponsible(e.target.value)} placeholder="e.g. John (loader) / CCTV" className="bg-white border-slate-300 text-center" />
            </div>
            <div className="bg-amber-50 p-2 rounded border border-amber-200 text-xs text-center text-amber-800">
              Will deduct from stock and log in Inventory Movements as {adjustType} for analytics & staff audit.
            </div>
            <DialogFooter className="sm:justify-center gap-2">
              <Button type="button" variant="outline" onClick={()=>setShowAdjustModal(false)} className="rounded">Cancel</Button>
              <Button type="submit" disabled={adjusting} className="rounded bg-amber-600 hover:bg-amber-700 text-white">
                {adjusting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging...</> : `Confirm -${adjustQty}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}