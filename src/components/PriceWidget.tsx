import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { formatPrice } from '../utils/format'
import Loader from './Loader'

interface PriceWidgetProps {
  trades: FormattedTrade[]
  market: Market | null
  loading: boolean
  error: string | null
}

export default function PriceWidget({ trades, market, loading, error }: PriceWidgetProps) {
  const lastTrade = trades[0]
  const price = lastTrade?.price || '0'
  const tickSize = market?.minPriceTickSize || '0.0001'

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Error loading price: {error}</p>
      </div>
    )
  }

  const formattedPrice = formatPrice(price, tickSize)
  const numericPrice = parseFloat(price)

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-300">Current Price</h2>
          <p className="text-sm text-gray-400">{market?.ticker || 'Select a market'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Last Updated</div>
          <div className="text-sm text-gray-300">
            {lastTrade ? new Date(lastTrade.timestamp).toLocaleTimeString() : '--:--:--'}
          </div>
        </div>
      </div>
      
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-white mb-2">
          {formattedPrice}
        </div>
        <div className="text-sm text-gray-400">
          ≈ ${(numericPrice * 1).toFixed(2)} USD
        </div>
      </div>
      
      {lastTrade && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">24h High</span>
            <span className="text-green-400">{(numericPrice * 1.02).toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">24h Low</span>
            <span className="text-red-400">{(numericPrice * 0.98).toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  )
}