import { Market } from '../types'
import Loader from './Loader'

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
  // Show full loading state only on initial load (no markets yet)
  const isInitialLoad = loading && markets.length === 0
  
  if (isInitialLoad) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Select Market</h2>
            <p className="text-sm text-gray-400">Loading markets...</p>
          </div>
          <Loader />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Select Market</h2>
          <p className="text-sm text-gray-400">Choose a spot market to view live data</p>
          {error && (
            <p className="text-sm text-red-400 mt-1">Error: {error}</p>
          )}
        </div>
        
        <div className="flex-1 max-w-md">
          <div className="relative">
            <select
              value={selectedMarket?.id || ''}
              onChange={(e) => {
                const market = markets.find(m => m.id === e.target.value)
                if (market) onMarketChange(market)
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              disabled={markets.length === 0}
            >
              {markets.length === 0 ? (
                <option value="">No markets available</option>
              ) : (
                <>
                  <option value="">Select a market...</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.ticker} ({market.baseDenom}/{market.quoteDenom})
                    </option>
                  ))}
                </>
              )}
            </select>
            
            {/* Dropdown arrow */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {selectedMarket && (
          <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-1.5 rounded-lg">
            Active: {selectedMarket.ticker}
          </div>
        )}
      </div>
    </div>
  )
}