import { useState, useEffect, useCallback } from 'react'
import { injectiveClient } from '../api/injectiveClient'
import { Market } from '../types'
import Loader from './Loader'

interface PriceWidgetProps {
  market: Market | null
  loading: boolean
  error: string | null
}

export default function PriceWidget({ market, loading }: PriceWidgetProps) {
  const [price, setPrice] = useState<string>('0')
  const [source, setSource] = useState<'pyth' | 'band' | 'none'>('pyth')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!market) return
    try {
      const { price: currentPrice, source: priceSource } = await injectiveClient.getCurrentPrice(market)
      setPrice(currentPrice)
      setSource(priceSource)
      if (currentPrice !== '0') setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to fetch price:', err)
    } finally {
      setIsLoading(false)
    }
  }, [market])

  useEffect(() => {
    if (!market) return
    setIsLoading(true)
    fetchPrice()
    const interval = setInterval(fetchPrice, 1000)
    return () => clearInterval(interval)
  }, [market, fetchPrice])

  const formattedPrice = (price: string): string => {
    const num = parseFloat(price)
    if (isNaN(num) || num === 0) return '—'
    if (num >= 10_000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (num >= 1) return num.toFixed(4)
    return num.toPrecision(4)
  }

  const sourceConfig = {
    pyth: { color: 'text-purple-400', bg: 'bg-purple-500/10', text: 'Pyth', border: 'border-purple-500/20' },
    band: { color: 'text-blue-400', bg: 'bg-blue-500/10', text: 'Band', border: 'border-blue-500/20' },
    none: { color: 'text-gray-400', bg: 'bg-gray-500/10', text: 'N/A', border: 'border-gray-500/20' },
  }

  if (loading || !market) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-64">
        <Loader />
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-300">{market.ticker}</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            Oracle: {market.baseSymbol}/{market.quoteSymbol}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${sourceConfig[source].bg} ${sourceConfig[source].color} border ${sourceConfig[source].border}`}>
              {sourceConfig[source].text}
            </span>
            <span className="text-xs text-gray-500">
              {source === 'pyth' ? 'High-Frequency' : source === 'band' ? 'Standard' : 'Unavailable'}
            </span>
          </div>
        </div>
        {lastUpdate && (
          <div className="text-right">
            <div className="text-xs text-gray-400">Last Update</div>
            <div className="text-sm text-gray-300">
              {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3 text-gray-400">Fetching price...</span>
          </div>
        ) : price === '0' ? (
          <div className="text-gray-500 py-8">
            Price unavailable for {market.baseSymbol}/{market.quoteSymbol}
          </div>
        ) : (
          <>
            <div className="text-4xl sm:text-5xl font-bold text-white mb-2 font-mono">
              {formattedPrice(price)}
            </div>
            <div className="text-sm text-gray-400 mb-1">{market.quoteSymbol}</div>
            <div className="mt-4 flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${source === 'pyth' ? 'bg-purple-500' : 'bg-green-500'}`} />
                <span className="text-gray-400">Live</span>
              </div>
              <div className="text-gray-500">Updates every 1s</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        <span>Powered by </span>
        <a href="https://pyth.network" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Pyth Network</a>
        <span className="mx-2">•</span>
        <a href="https://bandprotocol.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Band Protocol</a>
      </div>
    </div>
  )
}