import { useState, useEffect } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Market } from '../types'

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: NodeJS.Timeout

    const fetchMarkets = async () => {
      try {
        setLoading(true)
        const spotMarkets = await injectiveClient.getSpotMarkets()
        
        if (mounted) {
          const formattedMarkets: Market[] = spotMarkets
            .filter(market => market.marketStatus === 'active')
            .map(market => ({
              id: market.marketId,
              ticker: market.ticker,
              baseDenom: market.baseDenom,
              quoteDenom: market.quoteDenom,
              type: 'spot',
              minPriceTickSize: market.minPriceTickSize,
              minQuantityTickSize: market.minQuantityTickSize
            }))
            .slice(0, 20)

          setMarkets(formattedMarkets)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch markets')
          console.error('Error in useMarkets:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchMarkets()

    intervalId = setInterval(fetchMarkets, 30000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [])

  return { markets, loading, error }
}