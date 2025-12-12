import { Orderbook, Market } from '../types'
import { formatPrice, formatQuantity } from '../utils/format'
import Loader from './Loader'
import { useState, useEffect } from 'react'

interface OrderbookTableProps {
  orderbook: Orderbook
  market: Market | null
  loading: boolean
  error: string | null
}

export default function OrderbookTable({ orderbook, market, loading, error }: OrderbookTableProps) {
  const { bids = [], asks = [] } = orderbook
  const tickSize = market?.minPriceTickSize || 0.0001

  // Add animation for updates
  const [previousBidsLength, setPreviousBidsLength] = useState(0)
  const [previousAsksLength, setPreviousAsksLength] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (bids.length !== previousBidsLength || asks.length !== previousAsksLength) {
      setIsUpdating(true)
      const timer = setTimeout(() => setIsUpdating(false), 300)
      return () => clearTimeout(timer)
    }
    setPreviousBidsLength(bids.length)
    setPreviousAsksLength(asks.length)
  }, [bids.length, asks.length, previousBidsLength, previousAsksLength])

  if (loading && bids.length === 0 && asks.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <Loader />
      </div>
    )
  }

  if (error && bids.length === 0 && asks.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Error loading orderbook: {error}</p>
      </div>
    )
  }

  const maxBidQuantity = Math.max(...bids.map(b => {
    const qty = parseFloat(b.quantity)
    return isNaN(qty) ? 0 : qty
  }))
  const maxAskQuantity = Math.max(...asks.map(a => {
    const qty = parseFloat(a.quantity)
    return isNaN(qty) ? 0 : qty
  }))

  // Calculate spread from real data
  const bestBid = bids[0]?.price ? parseFloat(bids[0].price) : 0
  const bestAsk = asks[0]?.price ? parseFloat(asks[0].price) : 0
  const spread = bestBid > 0 && bestAsk > 0 ? bestAsk - bestBid : 0
  const spreadPercentage = bestBid > 0 ? (spread / bestBid) * 100 : 0

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-300">Order Book</h2>
          {!loading && (
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'}`}></div>
              <span className="ml-1 text-xs text-blue-400">LIVE</span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-400">
          Depth: {bids.length} bids • {asks.length} asks • Auto-refresh: 3s
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bids */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-400 mb-2">Bids (Buy)</h3>
            <div className="text-xs text-gray-400 grid grid-cols-2 mb-2">
              <span>Price ({market?.quoteDenom || ''})</span>
              <span className="text-right">Size ({market?.baseDenom || ''})</span>
            </div>
          </div>
          <div className="space-y-1">
            {loading && bids.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
                <div className="text-gray-500 text-sm">Loading bids...</div>
              </div>
            ) : bids.length > 0 ? (
              bids.map((bid, index) => {
                const quantity = parseFloat(bid.quantity) || 0
                const widthPercent = maxBidQuantity > 0 ? (quantity / maxBidQuantity) * 100 : 0
                
                return (
                  <div 
                    key={`bid-${index}-${bid.price}`} 
                    className={`relative transition-all duration-300 ${
                      isUpdating ? 'opacity-90' : 'opacity-100'
                    }`}
                  >
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-500/10 rounded transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5">
                      <span className="text-green-400">
                        {formatPrice(bid.price, tickSize, market?.baseDenom, market?.quoteDenom)}
                      </span>
                      <span className="text-right text-gray-300">
                        {formatQuantity(bid.quantity, market?.baseDenom)}
                      </span>
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
              <span>Price ({market?.quoteDenom || ''})</span>
              <span className="text-right">Size ({market?.baseDenom || ''})</span>
            </div>
          </div>
          <div className="space-y-1">
            {loading && asks.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2"></div>
                <div className="text-gray-500 text-sm">Loading asks...</div>
              </div>
            ) : asks.length > 0 ? (
              asks.map((ask, index) => {
                const quantity = parseFloat(ask.quantity) || 0
                const widthPercent = maxAskQuantity > 0 ? (quantity / maxAskQuantity) * 100 : 0
                
                return (
                  <div 
                    key={`ask-${index}-${ask.price}`} 
                    className={`relative transition-all duration-300 ${
                      isUpdating ? 'opacity-90' : 'opacity-100'
                    }`}
                  >
                    <div 
                      className="absolute right-0 top-0 h-full bg-red-500/10 rounded transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5">
                      <span className="text-red-400">
                        {formatPrice(ask.price, tickSize, market?.baseDenom, market?.quoteDenom)}
                      </span>
                      <span className="text-right text-gray-300">
                        {formatQuantity(ask.quantity, market?.baseDenom)}
                      </span>
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

      {/* Spread - only show if we have both bids and asks */}
      {bestBid > 0 && bestAsk > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Spread</span>
            <div className={`transition-all duration-300 ${isUpdating ? 'scale-105' : ''}`}>
              <span className="text-gray-300">
                {formatPrice(bestBid.toString(), tickSize, market?.baseDenom, market?.quoteDenom)} - {formatPrice(bestAsk.toString(), tickSize, market?.baseDenom, market?.quoteDenom)}
              </span>
              <span className="ml-2 text-yellow-400">
                ({spreadPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}