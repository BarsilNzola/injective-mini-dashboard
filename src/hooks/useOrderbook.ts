import { useState, useEffect, useRef, useCallback } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Orderbook, OrderbookEntry } from '../types'
import { PriceLevel } from '@injectivelabs/sdk-ts'

// Configuration
const REFRESH_INTERVAL = 3000 // 3 seconds
const MAX_LEVELS = 10

export function useOrderbook(marketId: string | null) {
  const [orderbook, setOrderbook] = useState<Orderbook>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Refs for change detection
  const previousBidsRef = useRef<string>('')
  const previousAsksRef = useRef<string>('')
  const previousMarketIdRef = useRef<string | null>(null)
  const isMounted = useRef(true)

  const formatOrderbookEntry = useCallback((order: PriceLevel): OrderbookEntry => ({
    price: order.price,
    quantity: order.quantity,
    timestamp: order.timestamp || Date.now()
  }), [])

  const formatBids = useCallback((bids: PriceLevel[]): OrderbookEntry[] => {
    return bids
      .map(formatOrderbookEntry)
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, MAX_LEVELS)
  }, [formatOrderbookEntry])

  const formatAsks = useCallback((asks: PriceLevel[]): OrderbookEntry[] => {
    return asks
      .map(formatOrderbookEntry)
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, MAX_LEVELS)
  }, [formatOrderbookEntry])

  const fetchOrderbook = useCallback(async () => {
    if (!marketId) {
      setOrderbook({ bids: [], asks: [] })
      setLoading(false)
      previousBidsRef.current = ''
      previousAsksRef.current = ''
      return
    }

    try {
      const data = await injectiveClient.getSpotOrderbook(marketId)
      
      if (!isMounted.current) return

      if (data) {
        const formattedBids = formatBids(data.bids || [])
        const formattedAsks = formatAsks(data.asks || [])
        
        // Create string representations for comparison
        const newBidsString = JSON.stringify(formattedBids.map(b => b.price))
        const newAsksString = JSON.stringify(formattedAsks.map(a => a.price))
        
        // Reset comparison when market changes
        const marketChanged = previousMarketIdRef.current !== marketId
        if (marketChanged) {
          previousMarketIdRef.current = marketId
          previousBidsRef.current = ''
          previousAsksRef.current = ''
        }
        
        // Check if data actually changed
        const bidsChanged = newBidsString !== previousBidsRef.current
        const asksChanged = newAsksString !== previousAsksRef.current
        
        // Update if data changed or market changed
        if (bidsChanged || asksChanged || marketChanged) {
          setOrderbook({
            bids: formattedBids,
            asks: formattedAsks
          })
          previousBidsRef.current = newBidsString
          previousAsksRef.current = newAsksString
          setError(null)
          setLastUpdated(new Date())
        }
        
        setLoading(false)
      }
    } catch (err) {
      if (!isMounted.current) return
      
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook')
      console.error('Error in useOrderbook:', err)
      setLoading(false)
    }
  }, [marketId, formatBids, formatAsks])

  // Reset when marketId becomes null
  useEffect(() => {
    if (!marketId) {
      setOrderbook({ bids: [], asks: [] })
      previousBidsRef.current = ''
      previousAsksRef.current = ''
    }
  }, [marketId])

  // Main fetch effect
  useEffect(() => {
    isMounted.current = true
    
    if (marketId) {
      fetchOrderbook()
    }

    const intervalId = setInterval(() => {
      if (marketId) {
        fetchOrderbook()
      }
    }, REFRESH_INTERVAL)

    return () => {
      isMounted.current = false
      clearInterval(intervalId)
    }
  }, [marketId, fetchOrderbook])

  // Derived values
  const bestBid = orderbook.bids[0]?.price || null
  const bestAsk = orderbook.asks[0]?.price || null
  const spread = bestBid && bestAsk 
    ? (parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(4)
    : null
  const spreadPercentage = bestBid && bestAsk && parseFloat(bestBid) > 0
    ? ((parseFloat(bestAsk) - parseFloat(bestBid)) / parseFloat(bestBid) * 100).toFixed(2)
    : null

  return { 
    orderbook, 
    loading, 
    error,
    lastUpdated,
    bestBid,
    bestAsk,
    spread,
    spreadPercentage,
    isEmpty: orderbook.bids.length === 0 && orderbook.asks.length === 0 && !loading
  }
}