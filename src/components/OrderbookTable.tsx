import { Orderbook, Market } from '../types'
import { formatPrice, formatQuantity } from '../utils/format'
import Loader from './Loader'

interface OrderbookTableProps {
  orderbook: Orderbook
  market: Market | null
  loading: boolean
  error: string | null
}

export default function OrderbookTable({ orderbook, market, loading, error }: OrderbookTableProps) {
  const { bids = [], asks = [] } = orderbook
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
        <p className="text-red-400">Error loading orderbook: {error}</p>
      </div>
    )
  }

  const maxBidQuantity = Math.max(...bids.map(b => parseFloat(b.quantity) || 0))
  const maxAskQuantity = Math.max(...asks.map(a => parseFloat(a.quantity) || 0))

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-300">Order Book</h2>
        <div className="text-sm text-gray-400">
          Depth: {bids.length} bids • {asks.length} asks
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bids */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-400 mb-2">Bids (Buy)</h3>
            <div className="text-xs text-gray-400 grid grid-cols-2 mb-2">
              <span>Price</span>
              <span className="text-right">Size</span>
            </div>
          </div>
          <div className="space-y-1">
            {bids.length > 0 ? (
              bids.map((bid, index) => {
                const quantity = parseFloat(bid.quantity) || 0
                const widthPercent = maxBidQuantity > 0 ? (quantity / maxBidQuantity) * 100 : 0
                
                return (
                  <div key={`bid-${index}-${bid.price}`} className="relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-500/10 rounded"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5">
                      <span className="text-green-400">{formatPrice(bid.price, tickSize)}</span>
                      <span className="text-right text-gray-300">{formatQuantity(bid.quantity)}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-4">No bids available</div>
            )}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">Asks (Sell)</h3>
            <div className="text-xs text-gray-400 grid grid-cols-2 mb-2">
              <span>Price</span>
              <span className="text-right">Size</span>
            </div>
          </div>
          <div className="space-y-1">
            {asks.length > 0 ? (
              asks.map((ask, index) => {
                const quantity = parseFloat(ask.quantity) || 0
                const widthPercent = maxAskQuantity > 0 ? (quantity / maxAskQuantity) * 100 : 0
                
                return (
                  <div key={`ask-${index}-${ask.price}`} className="relative">
                    <div 
                      className="absolute right-0 top-0 h-full bg-red-500/10 rounded"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5">
                      <span className="text-red-400">{formatPrice(ask.price, tickSize)}</span>
                      <span className="text-right text-gray-300">{formatQuantity(ask.quantity)}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-4">No asks available</div>
            )}
          </div>
        </div>
      </div>

      {/* Spread */}
      {bids.length > 0 && asks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Spread</span>
            <div>
              <span className="text-gray-300">
                {formatPrice(asks[0]?.price, tickSize)} - {formatPrice(bids[0]?.price, tickSize)}
              </span>
              <span className="ml-2 text-yellow-400">
                ({((parseFloat(asks[0]?.price) - parseFloat(bids[0]?.price)) / parseFloat(bids[0]?.price) * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}