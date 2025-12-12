import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0])
    }
  }, [markets, selectedMarket])

  const { orderbook, loading: orderbookLoading, error: orderbookError } = useOrderbook(selectedMarket?.id || null)
  const { trades, loading: tradesLoading, error: tradesError } = useTrades(selectedMarket?.id || null)

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
                trades={trades}
                market={selectedMarket}
                loading={tradesLoading}
                error={tradesError}
              />
            </div>
            <div className="lg:col-span-2">
              <OrderbookTable
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
              trades={trades}
              market={selectedMarket}
              loading={tradesLoading}
              error={tradesError}
            />
          </div>

          {/* Bottom Row: Trades List */}
          <div>
            <TradesList
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