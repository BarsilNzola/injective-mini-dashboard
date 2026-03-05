import { useState, useEffect, useRef, useCallback } from 'react'
import { injectiveClient, FormattedTrade } from '../api/injectiveClient'

// Configuration
const REFRESH_INTERVAL = 3000 // 3 seconds
const MAX_TRADES = 50

export function useTrades(marketId: string | null) {
  const [trades, setTrades] = useState<FormattedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Refs for change detection and mounted state
  const previousPriceRef = useRef<string>('')
  const previousMarketIdRef = useRef<string | null>(null)
  const isMounted = useRef(true)

  const fetchTrades = useCallback(async () => {
    if (!marketId) {
      setTrades([])
      setLoading(false)
      previousPriceRef.current = ''
      return
    }

    try {
      const data = await injectiveClient.getSpotTrades(marketId, MAX_TRADES)
      
      if (!isMounted.current) return

      if (data && data.length > 0) {
        const latestTrade = data[0]
        const latestPrice = latestTrade?.price || '0'
        
        // Reset comparison when market changes
        const marketChanged = previousMarketIdRef.current !== marketId
        if (marketChanged) {
          previousMarketIdRef.current = marketId
          previousPriceRef.current = ''
        }
        
        const previousPrice = previousPriceRef.current
        
        // Always update on first load, price changes, or market changes
        if (previousPrice === '' || latestPrice !== previousPrice || marketChanged) {
          setTrades(data)
          previousPriceRef.current = latestPrice
          setError(null)
          setLastUpdated(new Date())
        }
        
        setLoading(false)
      } else if (data && data.length === 0) {
        // No trades yet for this market
        setTrades([])
        setLoading(false)
      }
    } catch (err) {
      if (!isMounted.current) return
      
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
      console.error('Error in useTrades:', err)
      setLoading(false)
    }
  }, [marketId])

  // Reset when marketId becomes null
  useEffect(() => {
    if (!marketId) {
      setTrades([])
      previousPriceRef.current = ''
      previousMarketIdRef.current = null
    }
  }, [marketId])

  // Main fetch effect
  useEffect(() => {
    isMounted.current = true
    
    if (marketId) {
      fetchTrades()
    }

    const intervalId = setInterval(() => {
      if (marketId) {
        fetchTrades()
      }
    }, REFRESH_INTERVAL)

    return () => {
      isMounted.current = false
      clearInterval(intervalId)
    }
  }, [marketId, fetchTrades])

  // Derived values
  const lastPrice = trades[0]?.price || null
  const lastPriceChange = trades.length > 1 
    ? (parseFloat(trades[0].price) - parseFloat(trades[1].price)).toFixed(4)
    : null
  const priceChangeDirection = lastPriceChange && parseFloat(lastPriceChange) > 0 ? 'up' : 
                              lastPriceChange && parseFloat(lastPriceChange) < 0 ? 'down' : 'neutral'
  const totalVolume = trades
    .reduce((sum, trade) => sum + parseFloat(trade.quantity || '0'), 0)
    .toFixed(4)

  return { 
    trades, 
    loading, 
    error,
    lastUpdated,
    lastPrice,
    lastPriceChange,
    priceChangeDirection,
    totalVolume,
    isEmpty: trades.length === 0 && !loading
  }
}