type ReceiptData = {
  saleId: string
  storeName: string
  storeAddress?: string
  storePhone?: string
  items: {
    name: string
    qty: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  discount: number
  total: number
  paymentType: string
  date: Date
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  
  hours = hours % 12
  hours = hours ? hours : 12 // 0 should be 12
  const hoursStr = String(hours).padStart(2, '0')
  
  return `${day}/${month}/${year}, ${hoursStr}:${minutes}${ampm}`
}

export function generateReceiptHTML(data: ReceiptData): string {
  const receiptNo = data.saleId.slice(-8).toUpperCase()
  
  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="text-align: center;">${item.name}</td>
      <td style="text-align: center;">${item.qty}</td>
      <td style="text-align: center;">${formatNaira(item.unitPrice)}</td>
      <td style="text-align: center;">${formatNaira(item.total)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt ${receiptNo}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        body { 
          font-family: 'Bahnschrift SemiLight Condensed', 'Arial Narrow', sans-serif; 
          font-size: 10px; 
          line-height: 1.1;
          width: 58mm; 
          margin: 0; 
          padding: 2mm;
          color: #000;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          table-layout: fixed;
          font-size: 10px;
          border: 1px solid #000;
        }
        th, td { 
          padding: 2px 1px; 
          vertical-align: middle;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          text-align: center;
        }
        th { 
          font-size: 11px; 
          font-weight: bold; 
          border-bottom: 1px solid #000;
          text-align: center;
        }
        tr { border-bottom: 1px dotted #666; }
        th:nth-child(1), td:nth-child(1) { width: 40%; }
        th:nth-child(2), td:nth-child(2) { width: 10%; }
        th:nth-child(3), td:nth-child(3) { width: 25%; }
        th:nth-child(4), td:nth-child(4) { width: 25%; }
        h3 { font-size: 12px; margin: 0 0 4px 0; text-align: center; }
        p { margin: 2px 0; text-align: center; }
        .divider { border-top: 2px solid #000; margin: 12px 0; padding-top: 12px; }
        .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .total-final { font-weight: bold; font-size: 18px; }
      </style>
    </head>
    <body>
      <div style="text-align: center;">
        <h3>${data.storeName || 'Salestrack Pro'}</h3>
        ${data.storeAddress ? `<p style="font-size:12px; margin-bottom:4px; color:#666;">${data.storeAddress}</p>` : ''}
        ${data.storePhone ? `<p style="font-size:12px; margin-bottom:8px; color:#666;">Tel: ${data.storePhone}</p>` : ''}
        <p style="font-size: 12px;">Receipt: ${receiptNo}</p>
        <p style="font-size: 12px;">${formatDateTime(data.date)}</p>
      </div>

      <table style="width: 100%; margin-bottom: 16px; font-size: 13px;">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="divider">
        <div class="totals-row">
          <span>Subtotal:</span><span>${formatNaira(data.subtotal)}</span>
        </div>
        ${data.discount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${formatNaira(data.discount)}</span></div>` : ''}
        <div class="totals-row total-final">
          <span>TOTAL:</span><span>${formatNaira(data.total)}</span>
        </div>
        <div style="margin-top: 20px; text-align: center; font-size: 13px;">
          <p style="margin-bottom: 4px;">Thank you for your patronage!</p>
          <p style="font-style: italic; color: #666; margin: 0;">Built & Powered by Cursorlord Systems</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function printReceipt(
  data: ReceiptData, 
  storeAddress?: string | null, 
  storePhone?: string | null
) {
  const html = generateReceiptHTML({
    ...data,
    storeAddress: storeAddress || data.storeAddress || '',
    storePhone: storePhone || data.storePhone || ''
  })
  const printWindow = window.open('', '', 'width=400,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      setTimeout(() => printWindow.close(), 500)
    }
  }
}