import { useState, useEffect } from 'react'
import { injectiveClient, FormattedTrade } from '../api/injectiveClient'

export function useTrades(marketId: string | null) {
  const [trades, setTrades] = useState<FormattedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout

    const fetchTrades = async () => {
      if (!marketId) return

      try {
        setLoading(true)
        const data = await injectiveClient.getSpotTrades(marketId)
        
        if (mounted && data) {
          const formattedTrades = data.slice(0, 15)
          setTrades(formattedTrades)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trades')
          console.error('Error in useTrades:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchTrades()

    intervalId = setInterval(fetchTrades, 3000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [marketId])

  return { trades, loading, error }
}