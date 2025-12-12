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
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <p className="text-red-400">Error loading markets: {error}</p>
      </div>
    )
  }

  if (!markets.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <p className="text-gray-400">No active markets available on testnet</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Select Market</h2>
          <p className="text-sm text-gray-400">Choose a spot market to view live data</p>
        </div>
        <div className="flex-1 max-w-md">
          <select
            value={selectedMarket?.id || ''}
            onChange={(e) => {
              const market = markets.find(m => m.id === e.target.value)
              if (market) onMarketChange(market)
            }}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a market...</option>
            {markets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.ticker} ({market.baseDenom}/{market.quoteDenom})
              </option>
            ))}
          </select>
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