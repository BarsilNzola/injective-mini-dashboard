import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useMarkets } from '../hooks/useMarkets'
import { useOrderbook } from '../hooks/useOrderbook'
import { useTrades } from '../hooks/useTrades'
import { Market } from '../types'
import MarketSelector from '../components/MarketSelector'
import PriceWidget from '../components/PriceWidget'
import OrderbookTable from '../components/OrderbookTable'
import TradesList from '../components/TradesList'
import PriceChart from '../components/PriceChart'

// Define env type
const NETWORK = (import.meta as any).env?.VITE_INJECTIVE_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'

export default function Dashboard() {
  const { markets, loading: marketsLoading, error: marketsError } = useMarkets()
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  
  // Use a ref to track initial selection
  const initialSelectionDone = useRef(false)

  // Set initial market once when markets are loaded
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket && !initialSelectionDone.current) {
      // Try to load from localStorage first
      const savedMarketId = localStorage.getItem('selectedMarketId')
      const savedMarket = savedMarketId 
        ? markets.find(m => m.id === savedMarketId) 
        : null
      
      setSelectedMarket(savedMarket || markets[0])
      initialSelectionDone.current = true
    }
  }, [markets, selectedMarket])

  // Save selected market to localStorage
  useEffect(() => {
    if (selectedMarket) {
      localStorage.setItem('selectedMarketId', selectedMarket.id)
    }
  }, [selectedMarket])

  // Data hooks
  const { orderbook, loading: orderbookLoading, error: orderbookError } = useOrderbook(selectedMarket?.id || null)
  const { trades, loading: tradesLoading, error: tradesError } = useTrades(selectedMarket?.id || null)

  // Memoized loading and error states
  const isLoading = useMemo(() => 
    marketsLoading || (selectedMarket && (orderbookLoading || tradesLoading)),
    [marketsLoading, selectedMarket, orderbookLoading, tradesLoading]
  )

  // Combine errors for display
  const errorMessage = useMemo(() => 
    marketsError || orderbookError || tradesError,
    [marketsError, orderbookError, tradesError]
  )

  const handleMarketChange = useCallback((market: Market) => {
    setSelectedMarket(market)
  }, [])

  const handleRefresh = useCallback(() => {
    if (selectedMarket) {
      // Force re-fetch by triggering a re-render with the same market
      setSelectedMarket({ ...selectedMarket })
    }
  }, [selectedMarket])

  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Injective Dashboard</h1>
            <p className="text-sm text-gray-400">
              Real-time market data from Injective Protocol
            </p>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center gap-4 bg-gray-900/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700/50">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              <span className="text-sm text-gray-300">
                {NETWORK}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <button
              onClick={handleRefresh}
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1"
              title="Refresh data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={toggleDebug}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
              title="Toggle debug info"
            >
              🐛
            </button>
          </div>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Market Selector */}
        <MarketSelector
          markets={markets}
          selectedMarket={selectedMarket}
          onMarketChange={handleMarketChange}
          loading={marketsLoading}
          error={marketsError}
        />

        {/* Debug Info */}
        {showDebug && selectedMarket && (
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 font-mono text-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-purple-400 font-semibold">Debug Info</h3>
              <button onClick={toggleDebug} className="text-gray-500 hover:text-gray-400">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
              <div>
                <div className="text-gray-500 mb-1">Market ID</div>
                <div className="truncate">{selectedMarket.id}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Trades</div>
                <div>{trades.length} in view</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Orderbook</div>
                <div>{orderbook.bids.length} bids / {orderbook.asks.length} asks</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Loading</div>
                <div className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
                  {isLoading ? '⏳' : '✓'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedMarket ? (
          <>
            {/* Top Row: Price Widget and Orderbook */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PriceWidget
                  key={`price-${selectedMarket.id}`}
                  market={selectedMarket}
                  loading={tradesLoading || orderbookLoading}
                  error={tradesError || orderbookError}
                />
              </div>
              <div className="lg:col-span-2">
                <OrderbookTable
                  key={`orderbook-${selectedMarket.id}`}
                  orderbook={orderbook}
                  market={selectedMarket}
                  loading={orderbookLoading}
                  error={orderbookError}
                />
              </div>
            </div>

            {/* Middle Row: Price Chart */}
            <div>
              <PriceChart
                key={`chart-${selectedMarket.id}`}
                market={selectedMarket}
                loading={tradesLoading}
                error={tradesError}
              />
            </div>

            {/* Bottom Row: Trades List */}
            <div>
              <TradesList
                key={`trades-${selectedMarket.id}`}
                trades={trades}
                market={selectedMarket}
                loading={tradesLoading}
                error={tradesError}
              />
            </div>
          </>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 text-center border border-gray-700/50">
            <div className="max-w-md mx-auto">
              <svg className="w-20 h-20 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-300 mb-3">No Market Selected</h3>
              <p className="text-gray-500 mb-6">
                Choose a market from the dropdown above to view real-time trading data including price, order book, and recent trades.
              </p>
              {markets.length > 0 && (
                <button
                  onClick={() => setSelectedMarket(markets[0])}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Select First Market
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-4">
            <span>⚡ Powered by Injective</span>
            <span className="text-gray-700">•</span>
            <span>Auto-refresh: 3s</span>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://injective.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              Website
            </a>
            <a 
              href="https://docs.injective.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}