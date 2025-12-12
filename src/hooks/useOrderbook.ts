import { useState, useEffect, useRef } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Orderbook, OrderbookEntry } from '../types'
import { PriceLevel } from '@injectivelabs/sdk-ts'

export function useOrderbook(marketId: string | null) {
  const [orderbook, setOrderbook] = useState<Orderbook>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)

  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout

    const fetchOrderbook = async () => {
      if (!marketId) {
        setOrderbook({ bids: [], asks: [] })
        setLoading(false)
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

          // Simple check: if either bids or asks have changed
          const newBidsString = JSON.stringify(formattedBids.map(b => b.price).slice(0, 3))
          const newAsksString = JSON.stringify(formattedAsks.map(a => a.price).slice(0, 3))
          const oldBidsString = JSON.stringify(orderbook.bids.map(b => b.price).slice(0, 3))
          const oldAsksString = JSON.stringify(orderbook.asks.map(a => a.price).slice(0, 3))
          
          console.log(`Orderbook comparison: bids changed=${newBidsString !== oldBidsString}, asks changed=${newAsksString !== oldAsksString}`)
          
          // Update if data changed
          if (newBidsString !== oldBidsString || newAsksString !== oldAsksString) {
            console.log('Orderbook changed, updating UI')
            setOrderbook({
              bids: formattedBids,
              asks: formattedAsks
            })
            lastUpdateTimeRef.current = Date.now()
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
      lastUpdateTimeRef.current = 0
    }
  }, [marketId, orderbook.bids, orderbook.asks])

  return { orderbook, loading, error }
}