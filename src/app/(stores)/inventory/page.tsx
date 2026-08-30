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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { logAudit } from '@/lib/audit/logAudit'

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

const GROCERY_CATEGORIES = [
  "Perishable Foods",
  "Fruits & Vegetables",
  "Packaged Foods",
  "Grains & Tubers",
  "Beverages",
  "Toiletries",
  "Dairy Products",
  "Protein & Meat",
  "Bottled Drinks",
  "Canned Drinks",
  "Alcoholic & Wine",
  "Bakery Products",
  "Additives & Sweeteners",
  "Frozen Foods",
  "Canned & Shelved",
  "Seasoning & Spices",
  "Cooking Oil & Fats",
  "Snacks & Confectionery",
  "Baby & Child Care",
  "Body Care Products",
  "Fashion & Beauty",
  "Household Items",
  "Clothing & Body Worn",
  "Pest Control / Insecticides",
  "Tobacco",
  "Stationery",
  "Electronics",
  "Kitchen Utensils",
  "Toys & Games",
  "Others"
]

const UNIT_OPTIONS = [
  "pc", "cup", "jar", "can", "kg", "g", "litre", "ml", "pack", "packet", "carton",
  "crate", "bag", "tuber", "roll", "bundle", "bottle", "sachet", "tin", "wrap"
]

// FIX: Plural helper - add after UNIT_OPTIONS
const PLURAL_MAP: Record<string, string> = {
  pc: "Pcs",
  cup: "Cups",
  jar: "Jars",
  can: "Cans",
  kg: "Kg",
  g: "g",
  litre: "Litres",
  ml: "ml",
  pack: "Packs",
  packet: "Packets",
  carton: "Cartons",
  crate: "Crates",
  bag: "Bags",
  tuber: "Tubers",
  roll: "Rolls",
  bundle: "Bundles",
  bottle: "Bottles",
  sachet: "Sachets",
  tin: "Tins",
  wrap: "Wraps",
}

function formatStock(quantity: number, unit: string) {
  if (!unit) return `${quantity}`
  const lower = unit.toLowerCase()
  const plural = PLURAL_MAP[lower]
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
  const [profile, setProfile] = useState<any>(null) // ADD THIS LINE
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
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

if (error ||!newProduct) {
  toast.error("Failed to add product", { description: error?.message })
  return
}
logAudit("CREATE", `Added product: ${product.name}, Stock: ${product.quantity} ${product.base_unit} | ID: ${newProduct.id}`, "inventory").catch(e =>
  console.error('Audit failed:', e)
)
toast.success("Product added successfully")
setShowAddModal(false)

// Force refetch with delay to ensure FK relation is ready
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
                  <TableHead className="text-slate-700 text-center">Product Name</TableHead>
                  <TableHead className="text-slate-700 text-center">Category</TableHead>
                  <TableHead className="text-slate-700 text-center">Stock</TableHead>
                  <TableHead className="text-slate-700 text-center">Unit Cost</TableHead>
                  <TableHead className="text-slate-700 text-center">Unit Price</TableHead>
                  <TableHead className="text-slate-700 text-center">Profit %</TableHead>
                  <TableHead className="text-slate-700 text-center">Supplier</TableHead>
                  <TableHead className="text-slate-700 text-center">Status</TableHead>
                  <TableHead className="text-slate-700 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0? filteredData.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`border-slate-100 ${item.isLowStock? 'bg-red-50' : ''}`}
                  >
                    <TableCell className="font-medium text-slate-900 text-center">{item.name}</TableCell>
                    <TableCell className="text-slate-600 text-center">{item.category || '-'}</TableCell>
                    <TableCell className="text-slate-900 text-center font-semibold">
                      {formatStock(item.quantity, item.base_unit)}
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
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        {canPerformAction('update') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(item)
                              setShowEditModal(true)
                            }}
                            className="rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
                      <span className="text-slate-900 font-semibold">{formatStock(item.quantity, item.base_unit)}</span>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProduct(item)
                          setShowEditModal(true)
                        }}
                        className="rounded flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                    {canPerformAction('delete') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(item)
                          setShowDeleteModal(true)
                        }}
                        className="rounded flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-white" /> Delete
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
                      {GROCERY_CATEGORIES.map(cat => (
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
                      {UNIT_OPTIONS.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
                      {GROCERY_CATEGORIES.map(cat => (
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
                      {UNIT_OPTIONS.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
    </div>
  )
}