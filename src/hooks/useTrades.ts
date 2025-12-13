import { useState, useEffect, useRef } from 'react'
import { injectiveClient, FormattedTrade } from '../api/injectiveClient'

export function useTrades(marketId: string | null) {
  const [trades, setTrades] = useState<FormattedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousPriceRef = useRef<string>('')
  const previousMarketIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout

    const fetchTrades = async () => {
      if (!marketId) {
        if (mounted) {
          setTrades([])
          setLoading(false)
          previousPriceRef.current = ''
        }
        return
      }

      try {
        console.log(`[${new Date().toISOString()}] Fetching trades for ${marketId}`)
        const data = await injectiveClient.getSpotTrades(marketId)
        
        if (mounted && data && data.length > 0) {
          const latestTrade = data[0]
          const latestPrice = latestTrade?.price || '0'
          
          // Reset comparison when market changes
          const marketChanged = previousMarketIdRef.current !== marketId
          if (marketChanged) {
            console.log(`Market changed from ${previousMarketIdRef.current} to ${marketId}, forcing update`)
            previousMarketIdRef.current = marketId
            previousPriceRef.current = ''
          }
          
          const previousPrice = previousPriceRef.current
          
          console.log(`Price comparison: new=${latestPrice}, old=${previousPrice}, changed=${latestPrice !== previousPrice}`)
          
          // Always update on first load, price changes, or market changes
          if (previousPrice === '' || latestPrice !== previousPrice || marketChanged) {
            console.log(`Price changed from ${previousPrice} to ${latestPrice}, updating UI`)
            setTrades(data)
            previousPriceRef.current = latestPrice
            setError(null)
          } else {
            console.log('Price unchanged, skipping full update')
          }
          
          setLoading(false)
        } else if (mounted) {
          // No data or empty data
          setLoading(false)
        }
      } catch (err) {
        console.error('useTrades: Error fetching trades:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trades')
          setLoading(false)
        }
      }
    }

    // Fetch immediately
    fetchTrades()

    // Set up auto-refresh every 3 seconds
    intervalId = setInterval(fetchTrades, 3000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [marketId]) // Only depend on marketId

  return { trades, loading, error }
}