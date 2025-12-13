import { useState, useEffect, useRef } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Orderbook, OrderbookEntry } from '../types'
import { PriceLevel } from '@injectivelabs/sdk-ts'

export function useOrderbook(marketId: string | null) {
  const [orderbook, setOrderbook] = useState<Orderbook>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousBidsRef = useRef<string>('')
  const previousAsksRef = useRef<string>('')
  const previousMarketIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout

    const fetchOrderbook = async () => {
      if (!marketId) {
        if (mounted) {
          setOrderbook({ bids: [], asks: [] })
          setLoading(false)
          previousBidsRef.current = ''
          previousAsksRef.current = ''
        }
        return
      }

      try {
        console.log(`[${new Date().toISOString()}] Fetching orderbook for ${marketId}`)
        const data = await injectiveClient.getSpotOrderbook(marketId)
        
        if (mounted && data) {
          const bids = data.bids || []
          const asks = data.asks || []
          
          const formattedBids: OrderbookEntry[] = bids
            .map((order: PriceLevel) => ({
              price: order.price,
              quantity: order.quantity,
              timestamp: order.timestamp || Date.now()
            }))
            .sort((a: OrderbookEntry, b: OrderbookEntry) => parseFloat(b.price) - parseFloat(a.price))
            .slice(0, 10)

          const formattedAsks: OrderbookEntry[] = asks
            .map((order: PriceLevel) => ({
              price: order.price,
              quantity: order.quantity,
              timestamp: order.timestamp || Date.now()
            }))
            .sort((a: OrderbookEntry, b: OrderbookEntry) => parseFloat(a.price) - parseFloat(b.price))
            .slice(0, 10)

          // Create string representations for comparison
          const newBidsString = JSON.stringify(formattedBids.map(b => b.price))
          const newAsksString = JSON.stringify(formattedAsks.map(a => a.price))
          
          // Reset comparison when market changes
          const marketChanged = previousMarketIdRef.current !== marketId
          if (marketChanged) {
            console.log(`Market changed from ${previousMarketIdRef.current} to ${marketId}, forcing update`)
            previousMarketIdRef.current = marketId
            previousBidsRef.current = ''
            previousAsksRef.current = ''
          }
          
          // Check if data actually changed
          const bidsChanged = newBidsString !== previousBidsRef.current
          const asksChanged = newAsksString !== previousAsksRef.current
          
          console.log(`Orderbook comparison: bids changed=${bidsChanged}, asks changed=${asksChanged}`)
          
          // Update if data changed or market changed
          if (bidsChanged || asksChanged || marketChanged) {
            console.log('Orderbook changed, updating UI')
            setOrderbook({
              bids: formattedBids,
              asks: formattedAsks
            })
            previousBidsRef.current = newBidsString
            previousAsksRef.current = newAsksString
            setError(null)
          } else {
            console.log('Orderbook unchanged, skipping update')
          }
          
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch orderbook')
          console.error('Error in useOrderbook:', err)
          setLoading(false)
        }
      }
    }

    // Fetch immediately
    fetchOrderbook()

    // Set up auto-refresh every 3 seconds
    intervalId = setInterval(fetchOrderbook, 3000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [marketId])

  return { orderbook, loading, error }
}