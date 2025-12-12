import { useState, useEffect } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Orderbook, OrderbookEntry } from '../types'
import { PriceLevel } from '@injectivelabs/sdk-ts'

export function useOrderbook(marketId: string | null) {
  const [orderbook, setOrderbook] = useState<Orderbook>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setLoading(true)
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

          setOrderbook({
            bids: formattedBids,
            asks: formattedAsks
          })
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch orderbook')
          console.error('Error in useOrderbook:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchOrderbook()

    intervalId = setInterval(fetchOrderbook, 3000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [marketId])

  return { orderbook, loading, error }
}