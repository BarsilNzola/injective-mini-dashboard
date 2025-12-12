// Common token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  // Major tokens
  'INJ': 18,
  'USDT': 6,
  'USDC': 6,
  'BTC': 8,
  'ETH': 18,
  'ATOM': 6,
  'WETH': 18,
  'WBTC': 8,
  
  // Default for unknown tokens
  'DEFAULT': 18
}

// Helper function to extract token symbol from denom or ticker
function extractTokenSymbol(denom: string): string {
  if (!denom) return ''
  
  // Try to extract symbol from common patterns
  const upperDenom = denom.toUpperCase()
  
  // Check for direct matches
  for (const token in TOKEN_DECIMALS) {
    if (upperDenom.includes(token)) {
      return token
    }
  }
  
  // Check for peggy tokens
  if (upperDenom.includes('USDT') && upperDenom.includes('PEGGY')) {
    return 'USDT'
  }
  
  if (upperDenom.includes('USDC') && upperDenom.includes('PEGGY')) {
    return 'USDC'
  }
  
  return ''
}

// Convert API price (quote atto-units per base atto-unit) to human-readable price
export function convertPriceFromApi(
  apiPrice: string | number,
  baseDenom: string = '',
  quoteDenom: string = ''
): number {
  const price = typeof apiPrice === 'string' ? parseFloat(apiPrice) : apiPrice
  
  if (isNaN(price)) return 0
  if (price === 0) return 0
  
  // Extract token symbols from denoms
  const baseToken = extractTokenSymbol(baseDenom)
  const quoteToken = extractTokenSymbol(quoteDenom)
  
  // Get decimals for tokens
  const baseDecimals = baseToken ? TOKEN_DECIMALS[baseToken] || 18 : 18
  const quoteDecimals = quoteToken ? TOKEN_DECIMALS[quoteToken] || 6 : 6
  
  // The API price is in quote atto-units per base atto-unit
  // We need to convert to quote units per base unit
  const decimalsDiff = baseDecimals - quoteDecimals
  const actualPrice = price * Math.pow(10, decimalsDiff)
  
  return actualPrice
}

export function formatPrice(
  price: string | number,
  baseDenom: string = '',
  quoteDenom: string = ''
): string {
  if (!price) return '0'
  
  const priceNum = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(priceNum)) return '0'
  
  // Convert API price if we have denom info
  let actualPrice = priceNum
  if (baseDenom && quoteDenom) {
    actualPrice = convertPriceFromApi(priceNum, baseDenom, quoteDenom)
  }
  
  if (actualPrice === 0) return '0'
  
  // Always show 3 decimal places for better visibility
  if (actualPrice < 0.0001) {
    return actualPrice.toFixed(6)
  } else if (actualPrice < 1) {
    return actualPrice.toFixed(4)
  } else if (actualPrice < 1000) {
    return actualPrice.toFixed(3)
  } else if (actualPrice < 10000) {
    return actualPrice.toFixed(2)
  } else {
    return actualPrice.toFixed(1)
  }
}

export function convertQuantityFromApi(
  apiQuantity: string | number,
  denom: string = ''
): number {
  const quantity = typeof apiQuantity === 'string' ? parseFloat(apiQuantity) : apiQuantity
  
  if (isNaN(quantity)) return 0
  
  // Extract token symbol from denom
  const token = extractTokenSymbol(denom)
  
  // Get decimals for token
  const tokenDecimals = token ? TOKEN_DECIMALS[token] || 18 : 18
  
  // The API quantity is in atto-units
  // Convert to whole units: actualQuantity = apiQuantity / 10^tokenDecimals
  const actualQuantity = quantity / Math.pow(10, tokenDecimals)
  
  return actualQuantity
}

export function formatQuantity(
  quantity: string | number,
  denom: string = ''
): string {
  if (!quantity) return '0'
  
  const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  if (isNaN(quantityNum)) return '0'
  
  // Convert API quantity if we have denom info
  let actualQuantity = quantityNum
  if (denom) {
    actualQuantity = convertQuantityFromApi(quantityNum, denom)
  }
  
  if (actualQuantity === 0) return '0'
  
  // Format with appropriate decimal places
  if (actualQuantity >= 1000000000) {
    return (actualQuantity / 1000000000).toFixed(2) + 'B'
  } else if (actualQuantity >= 1000000) {
    return (actualQuantity / 1000000).toFixed(2) + 'M'
  } else if (actualQuantity >= 1000) {
    return (actualQuantity / 1000).toFixed(2) + 'K'
  } else if (actualQuantity >= 1) {
    return actualQuantity.toFixed(4)
  } else if (actualQuantity >= 0.001) {
    return actualQuantity.toFixed(6)
  } else if (actualQuantity >= 0.000001) {
    return actualQuantity.toFixed(8)
  } else {
    return actualQuantity.toFixed(10)
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