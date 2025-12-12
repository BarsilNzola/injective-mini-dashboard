export function formatPrice(price: string | number, tickSize: string | number = 0.0001): string {
    if (!price) return '0'
    
    const num = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(num)) return '0'
    
    const tickSizeNum = typeof tickSize === 'string' ? parseFloat(tickSize) : tickSize
    const tickSizeStr = tickSizeNum.toString()
    const decimalPlaces = tickSizeStr.includes('.') 
      ? tickSizeStr.split('.')[1].length 
      : 0
    
    return num.toFixed(decimalPlaces || 4)
  }
  
  export function formatQuantity(quantity: string | number): string {
    if (!quantity) return '0'
    
    const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity
    if (isNaN(num)) return '0'
    
    if (num >= 1000) {
      return num.toFixed(2)
    } else if (num >= 1) {
      return num.toFixed(4)
    } else {
      return num.toFixed(6)
    }
  }
  
  export function formatTimestamp(timestamp: number): string {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  
  export function formatTimeAgo(timestamp: number): string {
    if (!timestamp) return ''
    
    const now = Date.now()
    const diffMs = now - timestamp
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    
    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}d ago`
}