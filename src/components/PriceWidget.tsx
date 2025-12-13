import { FormattedTrade } from '../api/injectiveClient'
import { Market, Orderbook } from '../types'
import { formatPrice, convertPriceFromApi } from '../utils/format'
import Loader from './Loader'
import { useState, useEffect, useRef, useMemo } from 'react'

interface PriceWidgetProps {
  trades: FormattedTrade[]
  orderbook: Orderbook
  market: Market | null
  loading: boolean
  error: string | null
}

export default function PriceWidget({ trades, orderbook, market, loading, error }: PriceWidgetProps) {
  // Calculate current price from orderbook (mid price)
  const currentMarketPrice = useMemo(() => {
    const { bids = [], asks = [] } = orderbook
    
    if (bids.length === 0 && asks.length === 0) {
      return '0'
    }
    
    const bestBid = bids[0]
    const bestAsk = asks[0]
    
    if (!bestBid && !bestAsk) return '0'
    
    if (bestBid && bestAsk) {
      const bidPrice = parseFloat(bestBid.price)
      const askPrice = parseFloat(bestAsk.price)
      
      if (!isNaN(bidPrice) && !isNaN(askPrice) && bidPrice > 0 && askPrice > 0) {
        return ((bidPrice + askPrice) / 2).toString()
      }
    }
    
    if (bestBid && parseFloat(bestBid.price) > 0) {
      return bestBid.price
    }
    if (bestAsk && parseFloat(bestAsk.price) > 0) {
      return bestAsk.price
    }
    
    return '0'
  }, [orderbook])

  // Last trade price
  const lastTradePrice = trades[0]?.price || '0'
  const lastTradeTimestamp = trades[0]?.timestamp || 0
  
  // Decide which price to display
  const displayPrice = currentMarketPrice !== '0' ? currentMarketPrice : lastTradePrice
  const priceSource = currentMarketPrice !== '0' ? 'orderbook' : 'last trade'
  
  // Timestamp for display
  const displayTimestamp = currentMarketPrice !== '0' ? Date.now() : lastTradeTimestamp
  
  const tickSize = market?.minPriceTickSize || 0.0001
  
  // Animation state
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now())
  const previousPriceRef = useRef<string>('')
  const updateCountRef = useRef(0)

  // Update refresh time
  useEffect(() => {
    if (displayPrice !== '0') {
      setLastRefreshTime(Date.now())
    }
  }, [displayPrice])

  // Format the price
  const formattedPrice = useMemo(() => {
    if (!displayPrice || displayPrice === '0') return '0'
    return formatPrice(displayPrice, tickSize, market?.baseDenom, market?.quoteDenom)
  }, [displayPrice, tickSize, market?.baseDenom, market?.quoteDenom])

  // Animation effect
  useEffect(() => {
    if (displayPrice !== '0' && displayPrice !== previousPriceRef.current) {
      setIsUpdating(true)
      updateCountRef.current += 1
      
      const timer = setTimeout(() => setIsUpdating(false), 500)
      previousPriceRef.current = displayPrice
      return () => clearTimeout(timer)
    }
  }, [displayPrice])

  // Calculate price difference
  const priceDiff = useMemo(() => {
    if (currentMarketPrice !== '0' && lastTradePrice !== '0' && currentMarketPrice !== lastTradePrice) {
      const current = parseFloat(currentMarketPrice)
      const last = parseFloat(lastTradePrice)
      if (!isNaN(current) && !isNaN(last) && last > 0) {
        const diff = current - last
        const percent = (diff / last) * 100
        return {
          value: diff,
          percent,
          isPositive: diff > 0
        }
      }
    }
    return null
  }, [currentMarketPrice, lastTradePrice])

  // Calculate 24h stats
  const { highPrice, lowPrice, volume24h } = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentTrades = trades.filter(trade => {
      const tradePrice = parseFloat(trade.price)
      return trade.timestamp > twentyFourHoursAgo && !isNaN(tradePrice) && tradePrice > 0
    })
    
    let high = parseFloat(displayPrice) || 0
    let low = parseFloat(displayPrice) || 0
    let volume = 0
    
    if (recentTrades.length > 0) {
      const prices = recentTrades.map(t => 
        convertPriceFromApi(t.price, market?.baseDenom, market?.quoteDenom)
      ).filter(p => !isNaN(p) && p > 0)
      
      if (prices.length > 0) {
        high = Math.max(...prices)
        low = Math.min(...prices)
      }
      
      volume = recentTrades.reduce((sum, trade) => {
        const price = convertPriceFromApi(trade.price, market?.baseDenom, market?.quoteDenom)
        const quantity = parseFloat(trade.quantity) || 0
        return sum + (price * quantity)
      }, 0)
    }
    
    return { 
      highPrice: high.toFixed(4), 
      lowPrice: low.toFixed(4), 
      volume24h: volume.toFixed(2) 
    }
  }, [trades, displayPrice, market?.baseDenom, market?.quoteDenom])

  // Check if data is stale
  const isDataStale = useMemo(() => {
    const now = Date.now()
    const lastUpdateTime = Math.max(lastTradeTimestamp, lastRefreshTime)
    return now - lastUpdateTime > 5 * 60 * 1000
  }, [lastTradeTimestamp, lastRefreshTime])

  // Format market name
  const formattedMarketName = useMemo(() => {
    if (!market?.ticker) return 'Select a market'
    
    const [base, quote] = market.ticker.split('/')
    if (!base || !quote) return market.ticker
    
    // Shorten long addresses
    const shorten = (str: string) => 
      str.length > 12 ? `${str.slice(0, 6)}...${str.slice(-4)}` : str
    
    return `${shorten(base)}/${shorten(quote)}`
  }, [market?.ticker])

  // Format quote denom
  const formattedQuoteDenom = useMemo(() => {
    if (!market?.quoteDenom) return ''
    return market.quoteDenom.length > 8 
      ? `${market.quoteDenom.slice(0, 6)}...` 
      : market.quoteDenom
  }, [market?.quoteDenom])

  // Calculate spread and best bid/ask - FIXED FORMATTING
  const spreadInfo = useMemo(() => {
    const { bids = [], asks = [] } = orderbook
    
    if (bids.length === 0 || asks.length === 0) {
      return null
    }
    
    const bestBid = bids[0]
    const bestAsk = asks[0]
    
    if (!bestBid || !bestAsk) {
      return null
    }
    
    const bidPrice = parseFloat(bestBid.price)
    const askPrice = parseFloat(bestAsk.price)
    
    if (isNaN(bidPrice) || isNaN(askPrice) || bidPrice <= 0 || askPrice <= 0) {
      return null
    }
    
    const spread = askPrice - bidPrice
    const spreadPercent = (spread / bidPrice) * 100
    
    // Format prices based on their magnitude
    const formatSmallPrice = (price: number): string => {
      if (price < 0.0001) return price.toExponential(2)
      if (price < 0.01) return price.toFixed(6)
      if (price < 1) return price.toFixed(4)
      if (price < 100) return price.toFixed(3)
      if (price < 1000) return price.toFixed(2)
      return price.toFixed(1)
    }
    
    return {
      bid: formatPrice(bestBid.price, tickSize, market?.baseDenom, market?.quoteDenom),
      ask: formatPrice(bestAsk.price, tickSize, market?.baseDenom, market?.quoteDenom),
      spread: formatSmallPrice(spread),
      spreadPercent: spreadPercent.toFixed(2)
    }
  }, [orderbook, market, tickSize])

  // Log orderbook data for debugging
  useEffect(() => {
    if (orderbook && orderbook.bids?.length > 0 && orderbook.asks?.length > 0) {
      const bestBid = orderbook.bids[0]
      const bestAsk = orderbook.asks[0]
      console.log('Orderbook data in PriceWidget:', {
        bidRaw: bestBid.price,
        askRaw: bestAsk.price,
        bidParsed: parseFloat(bestBid.price),
        askParsed: parseFloat(bestAsk.price),
        tickSize,
        formattedBid: formatPrice(bestBid.price, tickSize, market?.baseDenom, market?.quoteDenom),
        formattedAsk: formatPrice(bestAsk.price, tickSize, market?.baseDenom, market?.quoteDenom)
      })
    }
  }, [orderbook, market, tickSize])

  if (loading && trades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="h-64 flex items-center justify-center">
          <Loader />
        </div>
      </div>
    )
  }

  if (error && trades.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Error loading price: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-300 truncate">Market Price</h2>
            {!loading && displayPrice !== '0' && !isDataStale && (
              <div className="flex items-center shrink-0">
                <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="ml-1 text-xs text-green-400">LIVE</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate" title={market?.ticker}>
            {formattedMarketName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">Source:</span>
            <span className={`text-xs ${priceSource === 'orderbook' ? 'text-green-400' : 'text-yellow-400'}`}>
              {priceSource}
            </span>
            {isDataStale && (
              <span className="text-xs text-yellow-500">• stale</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">Updated</div>
          <div className={`text-sm ${isDataStale ? 'text-yellow-400' : 'text-gray-300'}`}>
            {displayTimestamp ? new Date(displayTimestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            }) : '--:--:--'}
          </div>
        </div>
      </div>

      {/* Price Display */}
      <div className="text-center py-4">
        <div className={`text-3xl sm:text-4xl font-bold mb-2 transition-all duration-300 ${
          isUpdating ? 'text-white scale-105' : 'text-white'
        }`}>
          {displayPrice === '0' ? (
            <div className="text-xl text-gray-500">No price data</div>
          ) : (
            <div className="break-all px-2">{formattedPrice}</div>
          )}
        </div>
        <div className="text-sm text-gray-400 mb-1">
          {formattedQuoteDenom}
        </div>
        
        {/* Price Difference */}
        {priceDiff && (
          <div className={`text-sm ${priceDiff.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {priceDiff.isPositive ? '↗' : '↘'} 
            {Math.abs(priceDiff.value).toFixed(4)} ({Math.abs(priceDiff.percent).toFixed(2)}%) vs trade
          </div>
        )}
      </div>

      {/* Stats */}
      {displayPrice !== '0' && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">24h High</div>
              <div className="text-sm text-green-400 font-medium truncate">
                {highPrice}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">24h Low</div>
              <div className="text-sm text-red-400 font-medium truncate">
                {lowPrice}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-400 mb-1">24h Volume</div>
              <div className="text-sm text-blue-400 font-medium truncate">
                {volume24h} {formattedQuoteDenom}
              </div>
            </div>
          </div>
          
          {/* Orderbook Info - FIXED: Using formatPrice */}
          {spreadInfo ? (
            <div className="pt-3 border-t border-gray-700/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400">Spread</div>
                <div className="text-sm text-purple-400 font-medium">
                  {spreadInfo.spread} ({spreadInfo.spreadPercent}%)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-900/30 p-2 rounded">
                  <div className="text-gray-400 mb-1">Best Bid</div>
                  <div className="text-green-400 font-medium">{spreadInfo.bid}</div>
                </div>
                <div className="bg-gray-900/30 p-2 rounded">
                  <div className="text-gray-400 mb-1">Best Ask</div>
                  <div className="text-red-400 font-medium">{spreadInfo.ask}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-700/30">
              <div className="text-xs text-gray-500 text-center py-2">
                {orderbook.bids?.length === 0 || orderbook.asks?.length === 0
                  ? 'Waiting for orderbook data...'
                  : 'No spread data available'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}