import { useState, useEffect, useRef } from 'react'
import { useMarkets } from '../hooks/useMarkets'
import { useOrderbook } from '../hooks/useOrderbook'
import { useTrades } from '../hooks/useTrades'
import { Market } from '../types'
import MarketSelector from '../components/MarketSelector'
import PriceWidget from '../components/PriceWidget'
import OrderbookTable from '../components/OrderbookTable'
import TradesList from '../components/TradesList'
import PriceChart from '../components/PriceChart'

export default function Dashboard() {
  const { markets, loading: marketsLoading, error: marketsError } = useMarkets()
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  
  // Use a ref to track initial selection
  const initialSelectionDone = useRef(false)

  useEffect(() => {
    // Only set initial market once when markets are loaded
    if (markets.length > 0 && !selectedMarket && !initialSelectionDone.current) {
      setSelectedMarket(markets[0])
      initialSelectionDone.current = true
    }
  }, [markets, selectedMarket])

  const { orderbook, loading: orderbookLoading, error: orderbookError } = useOrderbook(selectedMarket?.id || null)
  const { trades, loading: tradesLoading, error: tradesError } = useTrades(selectedMarket?.id || null)

  // Calculate current market price from orderbook
  const getCurrentMarketPrice = () => {
    if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
      return '0'
    }
    
    const bestBid = parseFloat(orderbook.bids[0]?.price || '0')
    const bestAsk = parseFloat(orderbook.asks[0]?.price || '0')
    
    if (bestBid > 0 && bestAsk > 0) {
      // Mid price: (best bid + best ask) / 2
      return ((bestBid + bestAsk) / 2).toString()
    } else if (bestBid > 0) {
      return bestBid.toString()
    } else if (bestAsk > 0) {
      return bestAsk.toString()
    }
    
    return '0'
  }

  const handleMarketChange = (market: Market) => {
    setSelectedMarket(market)
  }

  return (
    <div className="space-y-6">
      <MarketSelector
        markets={markets}
        selectedMarket={selectedMarket}
        onMarketChange={handleMarketChange}
        loading={marketsLoading}
        error={marketsError}
      />

      {selectedMarket ? (
        <>
          {/* Top Row: Price Widget and Orderbook */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PriceWidget
                key={`price-${selectedMarket.id}`} // Force re-render on market change
                trades={trades}
                orderbook={orderbook} // PASS ORDERBOOK DATA
                market={selectedMarket}
                loading={tradesLoading || orderbookLoading}
                error={tradesError || orderbookError}
              />
            </div>
            <div className="lg:col-span-2">
              <OrderbookTable
                key={`orderbook-${selectedMarket.id}`} // Force re-render on market change
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
              key={`chart-${selectedMarket.id}`} // Force re-render on market change
              trades={trades}
              orderbook={orderbook} 
              market={selectedMarket}
              loading={tradesLoading}
              error={tradesError}
            />
          </div>

          {/* Bottom Row: Trades List */}
          <div>
            <TradesList
              key={`trades-${selectedMarket.id}`} // Force re-render on market change
              trades={trades}
              market={selectedMarket}
              loading={tradesLoading}
              error={tradesError}
            />
          </div>
        </>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 text-center border border-gray-700/50">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Market Selected</h3>
            <p className="text-gray-500">Select a market from the dropdown above to view live data</p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-center text-sm text-gray-500">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <span>Connected to Injective Testnet • Auto-refresh: 3s</span>
        </div>
      </div>
    </div>
  )
}