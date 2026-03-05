import { Orderbook, Market } from '../types'
import { formatPrice, formatQuantity } from '../utils/format'
import Loader from './Loader'
import { useState, useEffect, useMemo, useCallback } from 'react'

interface OrderbookTableProps {
  orderbook: Orderbook
  market: Market | null
  loading: boolean
  error: string | null
}

export default function OrderbookTable({ orderbook, market, loading, error }: OrderbookTableProps) {
  const { bids = [], asks = [] } = orderbook
  const tickSize = market?.minPriceTickSize || 0.0001

  // Animation states
  const [previousBidsLength, setPreviousBidsLength] = useState(0)
  const [previousAsksLength, setPreviousAsksLength] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Detect updates for animation
  useEffect(() => {
    if (bids.length !== previousBidsLength || asks.length !== previousAsksLength) {
      setIsUpdating(true)
      const timer = setTimeout(() => setIsUpdating(false), 300)
      return () => clearTimeout(timer)
    }
    setPreviousBidsLength(bids.length)
    setPreviousAsksLength(asks.length)
  }, [bids.length, asks.length, previousBidsLength, previousAsksLength])

  // Calculate max quantities for depth visualization
  const { maxBidQuantity, maxAskQuantity } = useMemo(() => {
    const bidQtys = bids.map(b => parseFloat(b.quantity) || 0)
    const askQtys = asks.map(a => parseFloat(a.quantity) || 0)
    return {
      maxBidQuantity: Math.max(...bidQtys, 0),
      maxAskQuantity: Math.max(...askQtys, 0)
    }
  }, [bids, asks])

  // Calculate spread
  const { bestBid, bestAsk, spread, spreadPercentage } = useMemo(() => {
    const bid = bids[0]?.price ? parseFloat(bids[0].price) : 0
    const ask = asks[0]?.price ? parseFloat(asks[0].price) : 0
    const spreadAmount = bid > 0 && ask > 0 ? ask - bid : 0
    const percentage = bid > 0 ? (spreadAmount / bid) * 100 : 0
    
    return {
      bestBid: bid,
      bestAsk: ask,
      spread: spreadAmount,
      spreadPercentage: percentage
    }
  }, [bids, asks])

  // Calculate total depth
  const { totalBidVolume, totalAskVolume } = useMemo(() => {
    return {
      totalBidVolume: bids.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0),
      totalAskVolume: asks.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0)
    }
  }, [bids, asks])

  const handleRowHover = useCallback((id: string | null) => {
    setHoveredRow(id)
  }, [])

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
        <p className="text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error loading orderbook: {error}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-300">Order Book</h2>
          {!loading && (
            <div className="flex items-center bg-blue-500/10 px-2 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'}`} />
              <span className="ml-1 text-xs text-blue-400 font-medium">LIVE</span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-400 bg-gray-900/50 px-3 py-1 rounded-lg">
          <span className="text-green-400">{bids.length}</span> bids • 
          <span className="text-red-400 ml-1">{asks.length}</span> asks • 
          <span className="ml-1">3s refresh</span>
        </div>
      </div>

      {/* Depth summary */}
      {(bids.length > 0 || asks.length > 0) && (
        <div className="mb-4 text-xs text-gray-500 flex justify-between bg-gray-900/30 p-2 rounded-lg">
          <span>Bid depth: {totalBidVolume.toFixed(4)} {market?.baseDenom}</span>
          <span>Ask depth: {totalAskVolume.toFixed(4)} {market?.baseDenom}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Bids */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
              Bids (Buy)
              <span className="text-xs text-gray-500 font-normal ml-1">• Top 10</span>
            </h3>
            <div className="text-xs text-gray-400 grid grid-cols-2 mb-2 px-2">
              <span>Price ({market?.quoteDenom || ''})</span>
              <span className="text-right">Size ({market?.baseDenom || ''})</span>
            </div>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {loading && bids.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2" />
                <div className="text-gray-500 text-sm">Loading bids...</div>
              </div>
            ) : bids.length > 0 ? (
              bids.map((bid, index) => {
                const quantity = parseFloat(bid.quantity) || 0
                const widthPercent = maxBidQuantity > 0 ? (quantity / maxBidQuantity) * 100 : 0
                const rowId = `bid-${index}-${bid.price}`
                
                return (
                  <div 
                    key={rowId}
                    onMouseEnter={() => handleRowHover(rowId)}
                    onMouseLeave={() => handleRowHover(null)}
                    className={`relative transition-all duration-300 ${
                      isUpdating ? 'opacity-90' : 'opacity-100'
                    } ${hoveredRow === rowId ? 'scale-[1.02] z-10' : ''}`}
                  >
                    <div 
                      className="absolute left-0 top-0 h-full bg-green-500/10 rounded transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5 cursor-default">
                      <span className="text-green-400 font-medium">
                        {formatPrice(bid.price, tickSize, market?.baseDenom, market?.quoteDenom)}
                      </span>
                      <span className="text-right text-gray-300">
                        {formatQuantity(bid.quantity, market?.baseDenom)}
                      </span>
                    </div>
                    {hoveredRow === rowId && (
                      <div className="absolute right-0 top-0 bg-gray-800 text-xs text-gray-400 px-1 py-0.5 rounded-bl">
                        {quantity.toFixed(4)}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-8 border border-dashed border-gray-700 rounded-lg">
                No bids available
              </div>
            )}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
              Asks (Sell)
              <span className="text-xs text-gray-500 font-normal ml-1">• Top 10</span>
            </h3>
            <div className="text-xs text-gray-400 grid grid-cols-2 mb-2 px-2">
              <span>Price ({market?.quoteDenom || ''})</span>
              <span className="text-right">Size ({market?.baseDenom || ''})</span>
            </div>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {loading && asks.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2" />
                <div className="text-gray-500 text-sm">Loading asks...</div>
              </div>
            ) : asks.length > 0 ? (
              asks.map((ask, index) => {
                const quantity = parseFloat(ask.quantity) || 0
                const widthPercent = maxAskQuantity > 0 ? (quantity / maxAskQuantity) * 100 : 0
                const rowId = `ask-${index}-${ask.price}`
                
                return (
                  <div 
                    key={rowId}
                    onMouseEnter={() => handleRowHover(rowId)}
                    onMouseLeave={() => handleRowHover(null)}
                    className={`relative transition-all duration-300 ${
                      isUpdating ? 'opacity-90' : 'opacity-100'
                    } ${hoveredRow === rowId ? 'scale-[1.02] z-10' : ''}`}
                  >
                    <div 
                      className="absolute right-0 top-0 h-full bg-red-500/10 rounded transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                    <div className="relative grid grid-cols-2 text-sm hover:bg-gray-700/30 rounded px-2 py-1.5 cursor-default">
                      <span className="text-red-400 font-medium">
                        {formatPrice(ask.price, tickSize, market?.baseDenom, market?.quoteDenom)}
                      </span>
                      <span className="text-right text-gray-300">
                        {formatQuantity(ask.quantity, market?.baseDenom)}
                      </span>
                    </div>
                    {hoveredRow === rowId && (
                      <div className="absolute left-0 top-0 bg-gray-800 text-xs text-gray-400 px-1 py-0.5 rounded-br">
                        {quantity.toFixed(4)}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-8 border border-dashed border-gray-700 rounded-lg">
                No asks available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spread & Market Summary */}
      {bestBid > 0 && bestAsk > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-400 flex items-center gap-4">
              <span>Spread</span>
              <span className="text-gray-300 font-mono">
                {formatPrice(bestBid.toString(), tickSize)} - {formatPrice(bestAsk.toString(), tickSize)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                spreadPercentage < 0.1 ? 'bg-green-500/20 text-green-400' :
                spreadPercentage < 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {spreadPercentage.toFixed(3)}%
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Mid: {formatPrice(((bestBid + bestAsk) / 2).toString(), tickSize)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}