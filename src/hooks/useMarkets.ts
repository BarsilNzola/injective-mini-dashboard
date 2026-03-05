import { useState, useEffect, useCallback, useRef } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Market } from '../types'

const REFRESH_INTERVAL = 30000
const MAX_MARKETS = 20

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isMounted = useRef(true)

  const fetchMarkets = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true)

      const allMarkets = await injectiveClient.getAllMarkets()

      if (!isMounted.current) return

      // No mapper needed — injectiveClient.getAllMarkets() now returns Market-shaped objects directly
      setMarkets(allMarkets.slice(0, MAX_MARKETS))
      setError(null)
      setLastUpdated(new Date())

    } catch (err) {
      if (!isMounted.current) return
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch markets'
      setError(errorMessage)
      console.error('Error in useMarkets:', err)

    } finally {
      if (isMounted.current && isInitialLoad) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchMarkets(true)

    const intervalId = setInterval(() => fetchMarkets(false), REFRESH_INTERVAL)

    return () => {
      isMounted.current = false
      clearInterval(intervalId)
    }
  }, [fetchMarkets])

  const refreshMarkets = useCallback(async () => {
    await fetchMarkets(true)
  }, [fetchMarkets])

  const getMarketById = useCallback((id: string): Market | undefined => {
    return markets.find(market => market.id === id)
  }, [markets])

  return {
    markets,
    loading,
    error,
    lastUpdated,
    refreshMarkets,
    getMarketById,
    isEmpty: markets.length === 0 && !loading
  }
}