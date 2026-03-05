import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { formatPrice, formatQuantity, formatTimeAgo } from '../utils/format'
import Loader from './Loader'
import { useState, useEffect, useMemo, useCallback } from 'react'

interface TradesListProps {
  trades: FormattedTrade[]
  market: Market | null
  loading: boolean
  error: string | null
}

export default function TradesList({ trades, market, loading, error }: TradesListProps) {
  const tickSize = market?.minPriceTickSize || 0.0001
  
  // Animation states
  const [previousTradesLength, setPreviousTradesLength] = useState(0)
  const [newTradeId, setNewTradeId] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Detect new trades
  useEffect(() => {
    if (trades.length > previousTradesLength && previousTradesLength > 0) {
      // Highlight the newest trade
      setNewTradeId(trades[0]?.id || null)
      const timer = setTimeout(() => setNewTradeId(null), 2000)
      return () => clearTimeout(timer)
    }
    setPreviousTradesLength(trades.length)
  }, [trades, previousTradesLength])

  // Calculate statistics
  const stats = useMemo(() => {
    if (trades.length === 0) return null
    
    const buyTrades = trades.filter(t => t.direction === 'buy')
    const sellTrades = trades.filter(t => t.direction === 'sell')
    const buyVolume = buyTrades.reduce((sum, t) => sum + parseFloat(t.quantity || '0'), 0)
    const sellVolume = sellTrades.reduce((sum, t) => sum + parseFloat(t.quantity || '0'), 0)
    
    return {
      total: trades.length,
      buys: buyTrades.length,
      sells: sellTrades.length,
      buyVolume: buyVolume.toFixed(4),
      sellVolume: sellVolume.toFixed(4),
      ratio: buyTrades.length > 0 ? (buyTrades.length / trades.length * 100).toFixed(1) : '0'
    }
  }, [trades])

  const handleRowHover = useCallback((id: string | null) => {
    setHoveredRow(id)
  }, [])

  if (loading && trades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <Loader />
      </div>
    )
  }

  if (error && trades.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error loading trades: {error}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-300">Recent Trades</h2>
          {!loading && trades.length > 0 && (
            <div className="flex items-center bg-green-500/10 px-2 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="ml-1 text-xs text-green-400 font-medium">LIVE</span>
            </div>
          )}
        </div>
        
        {/* Trade stats */}
        {stats && (
          <div className="flex items-center gap-3 text-xs bg-gray-900/50 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400">
              <span className="text-green-400 font-medium">{stats.buys}</span> buys
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              <span className="text-red-400 font-medium">{stats.sells}</span> sells
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              Ratio: <span className="text-blue-400 font-medium">{stats.ratio}%</span>
            </span>
          </div>
        )}
        
        <div className="text-sm text-gray-400 bg-gray-900/30 px-3 py-1.5 rounded-lg">
          <span className="font-medium text-white">{trades.length}</span> trades • 3s refresh
        </div>
      </div>

      {/* Volume summary */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2">
            <div className="text-gray-400 mb-1">Buy Volume</div>
            <div className="text-green-400 font-medium">{stats.buyVolume} {market?.baseDenom}</div>
          </div>
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
            <div className="text-gray-400 mb-1">Sell Volume</div>
            <div className="text-red-400 font-medium">{stats.sellVolume} {market?.baseDenom}</div>
          </div>
        </div>
      )}

      {/* Trades Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700/50">
              <th className="pb-3 font-medium">Price ({market?.quoteDenom || ''})</th>
              <th className="pb-3 font-medium text-right">Amount ({market?.baseDenom || ''})</th>
              <th className="pb-3 font-medium text-right">Time</th>
              <th className="pb-3 font-medium text-right">Side</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {trades.length > 0 ? (
              trades.map((trade, index) => {
                const isNew = trade.id === newTradeId
                const isHovered = hoveredRow === trade.id
                
                return (
                  <tr 
                    key={trade.id || trade.hash || index}
                    onMouseEnter={() => handleRowHover(trade.id || null)}
                    onMouseLeave={() => handleRowHover(null)}
                    className={`transition-all duration-300 ${
                      isNew ? 'bg-green-500/10' : ''
                    } ${isHovered ? 'bg-gray-700/30 scale-[1.01] shadow-lg' : ''}`}
                  >
                    <td className="py-3">
                      <span className={`font-mono font-medium ${
                        trade.direction === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPrice(trade.price, tickSize, market?.baseDenom, market?.quoteDenom)}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-gray-300">
                      {formatQuantity(trade.quantity, market?.baseDenom)}
                    </td>
                    <td className="py-3 text-right text-gray-400 text-sm font-mono">
                      {formatTimeAgo(trade.timestamp)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        trade.direction === 'buy' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>No trades available for this market</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {trades.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between items-center">
          <span>
            Latest trade: {formatTimeAgo(trades[0]?.timestamp || 0)}
          </span>
          <span className="text-gray-600">
            Updates every 3 seconds
          </span>
        </div>
      )}
    </div>
  )
}