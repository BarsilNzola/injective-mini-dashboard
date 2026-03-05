import { Market } from '../types'
import Loader from './Loader'
import { useMemo } from 'react'

interface MarketSelectorProps {
  markets: Market[]
  selectedMarket: Market | null
  onMarketChange: (market: Market) => void
  loading: boolean
  error: string | null
}

export default function MarketSelector({
  markets,
  selectedMarket,
  onMarketChange,
  loading,
  error
}: MarketSelectorProps) {
  const isInitialLoad = loading && markets.length === 0

  const groupedMarkets = useMemo(() => {
    const spot = markets.filter(m => m.marketType === 'spot')
    const derivatives = markets.filter(m => m.marketType === 'derivative')
    return { spot, derivatives }
  }, [markets])

  const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const market = markets.find(m => m.id === e.target.value)
    if (market) onMarketChange(market)
  }

  if (isInitialLoad) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Select Market</h2>
            <p className="text-sm text-gray-400">Loading markets...</p>
          </div>
          <Loader size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50 transition-all hover:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-[200px]">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            Select Market
            {!isInitialLoad && loading && <Loader size="sm" text="" />}
          </h2>
          <p className="text-sm text-gray-400">Choose a market to view live data</p>
          {error && (
            <p className="text-sm text-red-400 mt-1 bg-red-900/20 px-2 py-1 rounded">
              {error}
            </p>
          )}
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <select
              value={selectedMarket?.id || ''}
              onChange={handleMarketChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={markets.length === 0}
              aria-label="Select market"
            >
              <option value="">Select a market...</option>

              {groupedMarkets.spot.length > 0 && (
                <optgroup label="Spot Markets">
                  {groupedMarkets.spot.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.ticker}
                    </option>
                  ))}
                </optgroup>
              )}

              {groupedMarkets.derivatives.length > 0 && (
                <optgroup label="Derivatives">
                  {groupedMarkets.derivatives.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.ticker}
                    </option>
                  ))}
                </optgroup>
              )}

              {markets.length === 0 && (
                <option value="" disabled>No markets available</option>
              )}
            </select>

            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {selectedMarket && (
          <div className="text-sm text-gray-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 min-w-[120px] text-center">
            <span className="text-blue-400 font-medium">{selectedMarket.ticker}</span>
            <span className="text-gray-500 text-xs ml-1">
              ({selectedMarket.marketType === 'spot' ? 'Spot' : 'Perp'})
            </span>
          </div>
        )}
      </div>

      {selectedMarket && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-500 flex gap-4">
          <span>Min tick: {selectedMarket.minPriceTickSize}</span>
          <span>Min qty: {selectedMarket.minQuantityTickSize}</span>
        </div>
      )}
    </div>
  )
}