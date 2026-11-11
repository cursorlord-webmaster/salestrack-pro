type ReceiptData = {
  saleId: string
  storeName: string
  storeAddress?: string
  storePhone?: string
  items: { name: string; qty: number; unitPrice: number; total: number }[]
  subtotal: number
  discount: number
  total: number
  paymentType: string
  date: Date
}

function formatNaira(amount: number): string {
  return `N${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  return `${day}/${month}/${year}, ${String(hours).padStart(2, '0')}:${minutes}${ampm}`
}

// 48mm printable = 32 chars per line on Generic driver
const WIDTH = 32
// FIX: wrap long lines BEFORE centering
function center(text: string) {
  if (text.length <= WIDTH) {
    const pad = Math.floor((WIDTH - text.length) / 2)
    return ' '.repeat(pad) + text
  }
  // Long text: wrap it, center each wrapped line
  const wrapped = wrapName(text)
  return wrapped.map(l => {
    const pad = Math.max(0, Math.floor((WIDTH - l.length) / 2))
    return ' '.repeat(pad) + l
  }).join('\n')
}
function line(left: string, right: string) {
  const spaces = Math.max(1, WIDTH - left.length - right.length)
  return left + ' '.repeat(spaces) + right
}
function wrapName(name: string): string[] {
  const out: string[] = []
  let rest = name
  while (rest.length > WIDTH) {
    let cut = rest.lastIndexOf(' ', WIDTH)
    if (cut <= 0) cut = WIDTH
    out.push(rest.slice(0, cut))
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}

export function generateReceiptHTML(data: ReceiptData): string {
  const receiptNo = data.saleId.slice(-8).toUpperCase()
  const lines: string[] = []

  // Header - each on its own line, wrapped + centered
  lines.push(...center(data.storeName || 'Salestrack Pro').split('\n'))
  if (data.storeAddress) lines.push(...center(data.storeAddress).split('\n'))
  if (data.storePhone) lines.push(center(`Tel: ${data.storePhone}`))
  lines.push('='.repeat(WIDTH))
  lines.push(line('Date:', formatDateTime(data.date)))
  lines.push(line('Receipt #:', receiptNo))
  lines.push('='.repeat(WIDTH))

  for (const item of data.items) {
    for (const l of wrapName(item.name)) lines.push(l)
    lines.push(line(`${item.qty} x ${formatNaira(item.unitPrice)}`, formatNaira(item.total)))
    // SEPARATOR AFTER EACH ITEM
    lines.push('-'.repeat(WIDTH))
  }

  lines.push('='.repeat(WIDTH))
  lines.push(line('Subtotal:', formatNaira(data.subtotal)))
  if (data.discount > 0) lines.push(line('Discount:', `-${formatNaira(data.discount)}`))
  lines.push(line('TOTAL:', formatNaira(data.total)))
  lines.push(line('Payment:', data.paymentType))
  lines.push('='.repeat(WIDTH))
  lines.push(center('Thank you for your patronage!'))
  lines.push(center('Built & Powered by CursorLord Systems'))
  // FEED PAPER - use dots so Chrome can't trim them, printer feeds past tear-off
  lines.push('.')
  lines.push('.')
  lines.push('.')
  lines.push('.')
  lines.push('.')
  lines.push('.')

  const text = lines.join('\n')

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${receiptNo}</title>
    <style>
      @page { size: 58mm auto; margin: 0; }
      body { margin: 0; padding: 0; }
      pre { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.3; margin: 0; padding: 2mm 1mm; white-space: pre; }
    </style></head>
    <body><pre>${text}</pre></body></html>
  `
}

export function printReceipt(data: ReceiptData, storeAddress?: string | null, storePhone?: string | null) {
  const html = generateReceiptHTML({ ...data, storeAddress: storeAddress || data.storeAddress || '', storePhone: storePhone || data.storePhone || '' })
  const printWindow = window.open('', '', 'width=400,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print(); setTimeout(() => printWindow.close(), 500) }
  }
}