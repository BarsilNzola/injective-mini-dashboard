import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { formatPrice, formatQuantity, formatTimeAgo } from '../utils/format'
import Loader from './Loader'

interface TradesListProps {
  trades: FormattedTrade[]
  market: Market | null
  loading: boolean
  error: string | null
}

export default function TradesList({ trades, market, loading, error }: TradesListProps) {
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
        <p className="text-red-400">Error loading trades: {error}</p>
      </div>
    )
  }

  // Calculate total volume from real trades
  const totalVolume = trades.reduce((sum, trade) => {
    const quantity = parseFloat(trade.quantity) || 0
    return sum + quantity
  }, 0)

  // Calculate average price from real trades
  const validPrices = trades
    .map(trade => parseFloat(trade.price))
    .filter(price => !isNaN(price))
  
  const averagePrice = validPrices.length > 0 
    ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
    : 0

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-300">Recent Trades</h2>
        <div className="text-sm text-gray-400">
          {trades.length} trades • Live
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700/50">
              <th className="pb-3 font-medium">Price ({market?.quoteDenom || ''})</th>
              <th className="pb-3 font-medium text-right">Amount ({market?.baseDenom || ''})</th>
              <th className="pb-3 font-medium text-right">Time</th>
              <th className="pb-3 font-medium text-right">Side</th>
            </tr>
          </thead>
          <tbody>
            {trades.length > 0 ? (
              trades.map((trade) => (
                <tr 
                  key={trade.id || trade.hash} 
                  className="border-b border-gray-800/50 hover:bg-gray-700/20 transition-colors"
                >
                  <td className="py-3">
                    <span className={`font-medium ${
                      trade.direction === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPrice(trade.price, tickSize)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-300">
                    {formatQuantity(trade.quantity)}
                  </td>
                  <td className="py-3 text-right text-gray-400 text-sm">
                    {formatTimeAgo(trade.timestamp)}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.direction === 'buy' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No trades available for this market
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {trades.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-gray-400">Total Volume: </span>
              <span className="text-gray-300">
                {formatQuantity(totalVolume)} {market?.baseDenom || ''}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg Price: </span>
              <span className="text-gray-300">
                {formatPrice(averagePrice.toString(), tickSize)} {market?.quoteDenom || ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}