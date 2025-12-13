import { useState, useEffect, useMemo, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time } from 'lightweight-charts'
import { FormattedTrade } from '../api/injectiveClient'
import { Market, Orderbook } from '../types'
import { convertPriceFromApi, formatPrice } from '../utils/format'
import Loader from './Loader'

interface PriceChartProps {
  trades: FormattedTrade[]
  orderbook: Orderbook
  market: Market | null
  loading: boolean
  error: string | null
}

interface Timeframe {
  label: string
  value: number
  interval: string
}

interface CandlestickData {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

const TIMEFRAMES: Timeframe[] = [
  { label: '1m', value: 60 * 1000, interval: '1 minute' },
  { label: '5m', value: 5 * 60 * 1000, interval: '5 minutes' },
  { label: '15m', value: 15 * 60 * 1000, interval: '15 minutes' },
  { label: '1H', value: 60 * 60 * 1000, interval: '1 hour' },
  { label: '4H', value: 4 * 60 * 60 * 1000, interval: '4 hours' },
  { label: '1D', value: 24 * 60 * 60 * 1000, interval: '1 day' },
]

export default function PriceChart({ trades, orderbook, market, loading, error }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(TIMEFRAMES[2])
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const isChartInitializedRef = useRef(false)

  // Calculate current market price from orderbook
  const currentMarketPrice = useMemo(() => {
    if (!orderbook || !orderbook.bids || !orderbook.asks) return '0'
    
    const bestBid = orderbook.bids[0]
    const bestAsk = orderbook.asks[0]
    
    if (!bestBid && !bestAsk) return '0'
    
    if (bestBid && bestAsk) {
      const bidPrice = parseFloat(bestBid.price)
      const askPrice = parseFloat(bestAsk.price)
      if (!isNaN(bidPrice) && !isNaN(askPrice)) {
        return ((bidPrice + askPrice) / 2).toString()
      }
    }
    
    if (bestBid) return bestBid.price
    if (bestAsk) return bestAsk.price
    
    return '0'
  }, [orderbook])

  // Get formatted current price for display
  const formattedCurrentPrice = useMemo(() => {
    if (!market || currentMarketPrice === '0') return '0'
    
    const tickSize = market.minPriceTickSize || 0.0001
    return formatPrice(currentMarketPrice, tickSize, market.baseDenom, market.quoteDenom)
  }, [currentMarketPrice, market])

  // Process trades into candlestick data - IMPROVED VERSION
  const candlestickData = useMemo(() => {
    if (!market || trades.length === 0) {
      console.log('No market or trades for chart')
      return []
    }
    
    console.log(`Processing ${trades.length} trades for chart`)
    
    const interval = selectedTimeframe.value
    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp)
    
    if (sortedTrades.length === 0) return []
    
    // Find the time range of all trades
    const firstTradeTime = sortedTrades[0].timestamp
    const lastTradeTime = sortedTrades[sortedTrades.length - 1].timestamp
    const timeRange = lastTradeTime - firstTradeTime
    
    console.log(`Time range: ${timeRange / 1000} seconds, ${timeRange / (60 * 1000)} minutes`)
    
    // If we have very few trades relative to the timeframe, use a smaller timeframe
    let effectiveInterval = interval
    if (sortedTrades.length < 10 && timeRange < interval) {
      // Use 1/4 of the selected interval or 1 minute, whichever is larger
      effectiveInterval = Math.max(60 * 1000, Math.floor(interval / 4))
      console.log(`Few trades detected. Using smaller interval: ${effectiveInterval / 1000} seconds`)
    }
    
    // Group trades by timeframe
    const groupedTrades = new Map<number, FormattedTrade[]>()
    
    sortedTrades.forEach((trade, index) => {
      const intervalStart = Math.floor(trade.timestamp / effectiveInterval) * effectiveInterval
      const tradesInInterval = groupedTrades.get(intervalStart) || []
      tradesInInterval.push(trade)
      groupedTrades.set(intervalStart, tradesInInterval)
    })
    
    console.log(`Grouped into ${groupedTrades.size} intervals`)
    
    // Convert to candlestick data
    const candlesticks: CandlestickData[] = []
    const intervalStarts = Array.from(groupedTrades.keys()).sort((a, b) => a - b)
    
    for (let i = 0; i < intervalStarts.length; i++) {
      const intervalStart = intervalStarts[i]
      const intervalTrades = groupedTrades.get(intervalStart) || []
      
      if (intervalTrades.length === 0) continue
      
      // Convert prices
      const prices = intervalTrades
        .map(trade => {
          const convertedPrice = convertPriceFromApi(trade.price, market.baseDenom, market.quoteDenom)
          return convertedPrice
        })
        .filter(price => !isNaN(price) && price > 0)
      
      if (prices.length === 0) continue
      
      const open = prices[0]
      const close = prices[prices.length - 1]
      const high = Math.max(...prices)
      const low = Math.min(...prices)
      
      candlesticks.push({
        time: Math.floor(intervalStart / 1000) as Time,
        open,
        high,
        low,
        close,
      })
    }
    
    console.log(`Generated ${candlesticks.length} candles`)
    
    // If we have very few candles, try to create more by analyzing price patterns
    if (candlesticks.length < 10 && sortedTrades.length > 5) {
      console.log('Creating additional candles from price patterns...')
      
      // Create synthetic candles by analyzing price changes between trades
      const syntheticCandles: CandlestickData[] = []
      const tradesPerCandle = Math.max(2, Math.floor(sortedTrades.length / 10))
      
      for (let i = 0; i < sortedTrades.length; i += tradesPerCandle) {
        const tradeGroup = sortedTrades.slice(i, i + tradesPerCandle)
        if (tradeGroup.length === 0) continue
        
        const prices = tradeGroup
          .map(trade => convertPriceFromApi(trade.price, market.baseDenom, market.quoteDenom))
          .filter(price => !isNaN(price) && price > 0)
        
        if (prices.length === 0) continue
        
        const open = prices[0]
        const close = prices[prices.length - 1]
        const high = Math.max(...prices)
        const low = Math.min(...prices)
        
        // Use the timestamp of the first trade in the group
        const candleTime = Math.floor(tradeGroup[0].timestamp / 1000) as Time
        
        syntheticCandles.push({
          time: candleTime,
          open,
          high,
          low,
          close,
        })
      }
      
      // Combine with original candles and sort by time
      const allCandles = [...candlesticks, ...syntheticCandles]
        .sort((a, b) => (a.time as number) - (b.time as number))
        .slice(-50) // Take last 50 candles max
      
      console.log(`Added synthetic candles. Total: ${allCandles.length}`)
      return allCandles
    }
    
    return candlesticks.slice(-50) // Return last 50 candles max
  }, [trades, market, selectedTimeframe])

  // Calculate statistics
  const stats = useMemo(() => {
    if (candlestickData.length === 0 || !market) {
      return {
        currentPrice: '0',
        priceChange: 0,
        priceChangePercent: 0,
        periodHigh: '0',
        periodLow: '0',
        volume24h: '0',
        bullishCount: 0,
        bearishCount: 0
      }
    }

    // Get current price number for calculations
    let currentPriceNum = 0
    let priceChange = 0
    let priceChangePercent = 0
    
    if (currentMarketPrice !== '0') {
      currentPriceNum = parseFloat(currentMarketPrice) || 0
    } else if (candlestickData.length > 0) {
      currentPriceNum = candlestickData[candlestickData.length - 1]?.close || 0
    }
    
    // Calculate price change from previous candle
    if (candlestickData.length >= 2) {
      const previousPrice = candlestickData[candlestickData.length - 2]?.close || currentPriceNum
      priceChange = currentPriceNum - previousPrice
      priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0
    }
    
    // Get period high/low
    const periodHigh = Math.max(...candlestickData.map(c => c.high))
    const periodLow = Math.min(...candlestickData.map(c => c.low))
    
    // Calculate 24h volume
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentTrades = trades.filter(t => t.timestamp > twentyFourHoursAgo)
    const volume24h = recentTrades.reduce((sum, trade) => {
      const price = convertPriceFromApi(trade.price, market.baseDenom, market.quoteDenom)
      const quantity = parseFloat(trade.quantity) || 0
      return sum + (price * quantity)
    }, 0)
    
    const bullishCount = candlestickData.filter(c => c.close >= c.open).length
    const bearishCount = candlestickData.length - bullishCount

    return {
      currentPrice: formattedCurrentPrice,
      priceChange,
      priceChangePercent,
      periodHigh: periodHigh.toFixed(4),
      periodLow: periodLow.toFixed(4),
      volume24h: volume24h.toFixed(2),
      bullishCount,
      bearishCount
    }
  }, [candlestickData, market, currentMarketPrice, trades, formattedCurrentPrice])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !market || isChartInitializedRef.current) {
      return
    }

    // Clear previous chart if exists
    const cleanupChart = () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          // Ignore "Object is disposed" errors
        }
        chartRef.current = null
        seriesRef.current = null
      }
    }

    cleanupChart()

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1F2937' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#374151', visible: true },
        horzLines: { color: '#374151', visible: true },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.05, bottom: 0.05 }, // Adjusted for better visibility
        autoScale: true,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 12, // Increased for better visibility
        minBarSpacing: 6,
      },
      crosshair: {
        vertLine: { color: '#6B7280', width: 1, style: 2 },
        horzLine: { color: '#6B7280', width: 1, style: 2 },
      }
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceFormat: { 
        type: 'price', 
        precision: 6,
        minMove: 0.000001 
      },
    })

    chartRef.current = chart
    seriesRef.current = candleSeries
    isChartInitializedRef.current = true

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
        } catch (error) {
          // Ignore resize errors
        }
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      cleanupChart()
      isChartInitializedRef.current = false
    }
  }, [market])

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || candlestickData.length === 0) {
      return
    }

    try {
      seriesRef.current.setData(candlestickData)
      
      // Fit content and set visible range
      chartRef.current.timeScale().fitContent()
      
      // Show more candles if we have few
      if (candlestickData.length < 20) {
        // Show all candles with some padding
        const barSpacing = 12
        const width = chartContainerRef.current?.clientWidth || 800
        const visibleBars = Math.floor(width / barSpacing)
        
        const lastCandleIndex = candlestickData.length - 1
        const firstVisibleIndex = Math.max(0, lastCandleIndex - visibleBars + 3)
        
        if (candlestickData.length > 0) {
          chartRef.current.timeScale().setVisibleRange({
            from: candlestickData[firstVisibleIndex].time,
            to: candlestickData[lastCandleIndex].time
          })
        }
      }
    } catch (error) {
      console.log('Chart update error:', error)
    }
  }, [candlestickData])

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe)
    setShowTimeframeDropdown(false)
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTimeframeDropdown(false)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Reset chart when market changes
  useEffect(() => {
    isChartInitializedRef.current = false
  }, [market?.id])

  // Log data for debugging
  useEffect(() => {
    if (trades.length > 0) {
      console.log('=== CHART DATA DEBUG ===')
      console.log(`Total trades: ${trades.length}`)
      console.log(`Selected timeframe: ${selectedTimeframe.label} (${selectedTimeframe.value/1000}s)`)
      console.log(`Candles generated: ${candlestickData.length}`)
      
      if (candlestickData.length > 0) {
        console.log('Candle sample:')
        candlestickData.slice(-3).forEach((candle, i) => {
          console.log(`Candle ${candlestickData.length - 3 + i}:`, {
            time: new Date((candle.time as number) * 1000).toISOString(),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            hasBody: candle.open !== candle.close,
            hasWick: candle.high > Math.max(candle.open, candle.close) || 
                    candle.low < Math.min(candle.open, candle.close)
          })
        })
      }
      console.log('=======================')
    }
  }, [trades, candlestickData, selectedTimeframe])

  if (loading && trades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80">
        <Loader />
      </div>
    )
  }

  if (error && trades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
        <p className="text-red-400">Error loading chart: {error}</p>
      </div>
    )
  }

  if (!market || candlestickData.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">Chart data loading...</p>
          <p className="text-sm text-gray-600 mt-1">
            Trades: {trades.length} • Generating candles...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">Price Chart</h3>
          <p className="text-sm text-gray-400">
            {market.ticker} • {candlestickData.length} candles
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTimeframeDropdown(!showTimeframeDropdown)
              }}
              className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors w-24"
            >
              <span className="text-gray-300">{selectedTimeframe.label}</span>
              <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTimeframeDropdown && (
              <div className="absolute right-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-lg w-24">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTimeframeChange(tf)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors ${
                      selectedTimeframe.label === tf.label 
                        ? 'bg-gray-800 text-blue-400' 
                        : 'text-gray-300'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Current Price */}
          <div className="text-right flex-1 sm:flex-none">
            <div className="text-sm text-gray-400">Current</div>
            <div className={`text-xl font-bold ${stats.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.currentPrice}
            </div>
            <div className={`text-sm ${stats.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.priceChange >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div 
        ref={chartContainerRef} 
        className="h-64 rounded-lg overflow-hidden bg-gray-900/30"
      />
      
      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">High</div>
            <div className="text-green-400 font-medium">{stats.periodHigh}</div>
          </div>
          <div>
            <div className="text-gray-400">Low</div>
            <div className="text-red-400 font-medium">{stats.periodLow}</div>
          </div>
          <div>
            <div className="text-gray-400">Bullish</div>
            <div className="text-green-400 font-medium">{stats.bullishCount}</div>
          </div>
          <div>
            <div className="text-gray-400">Bearish</div>
            <div className="text-red-400 font-medium">{stats.bearishCount}</div>
          </div>
        </div>
        
        {/* Timeframe buttons */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedTimeframe.label === tf.label
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                  : 'bg-gray-900/30 text-gray-400 hover:bg-gray-800 border border-gray-700/30'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}