import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries, Time } from 'lightweight-charts'
import { Market, Orderbook } from '../types'
import { convertPriceFromApi } from '../utils/format'
import Loader from './Loader'

interface PriceChartProps {
  trades: any[]
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

const TIMEFRAMES: Timeframe[] = [
  { label: '1m', value: 60 * 1000, interval: '1 minute' },
  { label: '5m', value: 5 * 60 * 1000, interval: '5 minutes' },
  { label: '15m', value: 15 * 60 * 1000, interval: '15 minutes' },
  { label: '1H', value: 60 * 60 * 1000, interval: '1 hour' },
  { label: '4H', value: 4 * 60 * 60 * 1000, interval: '4 hours' },
  { label: '1D', value: 24 * 60 * 60 * 1000, interval: '1 day' },
]

interface LineData {
  time: Time
  value: number
}

export default function PriceChart({ orderbook, market, loading, error }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(TIMEFRAMES[2])
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [priceHistory, setPriceHistory] = useState<LineData[]>([])
  const samplingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate current market price with conversion
  const getCurrentMarketPrice = useCallback((): number => {
    if (!orderbook || !orderbook.bids || !orderbook.asks || !market) {
      return 0
    }
    
    const bestBid = orderbook.bids[0]
    const bestAsk = orderbook.asks[0]
    
    if (!bestBid && !bestAsk) {
      return 0
    }
    
    let bidPrice = 0
    let askPrice = 0
    
    if (bestBid) {
      bidPrice = convertPriceFromApi(bestBid.price, market.baseDenom, market.quoteDenom)
    }
    
    if (bestAsk) {
      askPrice = convertPriceFromApi(bestAsk.price, market.baseDenom, market.quoteDenom)
    }
    
    // Calculate mid price
    if (bidPrice > 0 && askPrice > 0) {
      return (bidPrice + askPrice) / 2
    }
    
    if (bidPrice > 0) return bidPrice
    if (askPrice > 0) return askPrice
    
    return 0
  }, [orderbook, market])

  // Format price to 4 decimal places
  const formatPriceToFourDecimals = useCallback((price: number): string => {
    if (price <= 0) return '0.0000'
    return price.toFixed(4)
  }, [])

  // Get formatted current price for display
  const formattedCurrentPrice = useMemo(() => {
    if (!market) return '0.0000'
    
    const currentPrice = getCurrentMarketPrice()
    return formatPriceToFourDecimals(currentPrice)
  }, [market, getCurrentMarketPrice, formatPriceToFourDecimals])

  // Start price sampling every second
  useEffect(() => {
    if (!market) {
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current)
        samplingIntervalRef.current = null
      }
      return
    }

    if (samplingIntervalRef.current) {
      clearInterval(samplingIntervalRef.current)
    }

    samplingIntervalRef.current = setInterval(() => {
      const currentPrice = getCurrentMarketPrice()
      
      if (currentPrice > 0) {
        const now = Date.now()
        const nowInSeconds = Math.floor(now / 1000)
        
        setPriceHistory(prev => {
          const newPoint: LineData = {
            time: nowInSeconds as Time,
            value: currentPrice
          }
          
          const updated = [...prev, newPoint]
          
          // Keep last 100 points for smoother chart
          if (updated.length > 100) {
            return updated.slice(-100)
          }
          return updated
        })
      }
    }, 1000)

    return () => {
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current)
        samplingIntervalRef.current = null
      }
    }
  }, [market, getCurrentMarketPrice])

  // Initialize chart with 4 decimal precision
  useEffect(() => {
    if (!chartContainerRef.current || !market) return

    if (chartRef.current) {
      chartRef.current.remove()
    }

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
        borderVisible: true,
        autoScale: true,
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
        entireTextOnly: false,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000)
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        visible: true,
        borderVisible: true,
        rightOffset: 10,
      },
      crosshair: {
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 2,
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4, // 4 decimal places
        minMove: 0.0001, // Minimum price movement
      },
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    })

    chartRef.current = chart
    seriesRef.current = lineSeries

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [market])

  // Update chart data
  useEffect(() => {
    if (seriesRef.current && chartRef.current && priceHistory.length > 0) {
      try {
        seriesRef.current.setData(priceHistory)
        chartRef.current.timeScale().fitContent()
        chartRef.current.timeScale().scrollToRealTime()
      } catch (error) {
        console.error('Error updating chart:', error)
      }
    }
  }, [priceHistory])

  // Handle timeframe change
  const handleTimeframeChange = useCallback((timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe)
    setShowTimeframeDropdown(false)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTimeframeDropdown(false)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Clear price history when market changes
  useEffect(() => {
    setPriceHistory([])
  }, [market?.id])

  // Loading state
  if (loading && !orderbook) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80">
        <Loader />
      </div>
    )
  }

  // Error state
  if (error && !orderbook) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
        <p className="text-red-400">Error loading chart data: {error}</p>
      </div>
    )
  }

  // No market selected
  if (!market) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Price Chart</h3>
          <p className="text-gray-500">Select a market to view price chart</p>
        </div>
      </div>
    )
  }

  const currentPrice = getCurrentMarketPrice()
  const hasPriceData = priceHistory.length > 0 && currentPrice > 0

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-fadeIn">
      <style>{`
        .tv-attr,
        .lightweight-charts-attr {
          display: none !important;
        }
      `}</style>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">Price Chart</h3>
          <p className="text-sm text-gray-400">
            {market.ticker} • Line chart • {priceHistory.length} points
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTimeframeDropdown(!showTimeframeDropdown)
              }}
              className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors min-w-[80px]"
            >
              <span className="text-gray-300">View</span>
              <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTimeframeDropdown && (
              <div className="absolute right-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-lg min-w-[80px]">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTimeframeChange(tf)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
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
          
          <div className="text-right">
            <div className="text-sm text-gray-400">Current Price</div>
            <div className="text-xl font-bold text-white">
              {formattedCurrentPrice}
              <span className="text-sm text-gray-400 ml-1">
                {market?.quoteDenom?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        ref={chartContainerRef} 
        className="h-64 rounded-lg overflow-hidden bg-gray-900/30"
        style={{ 
          minHeight: '256px',
          position: 'relative',
          zIndex: 1
        }}
      />
      
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        {hasPriceData ? (
          <>
            <div className="text-center">
              <p className="text-gray-500">Price chart active</p>
              <p className="text-sm text-gray-600 mt-1">
                Current: <span className="font-medium text-white">{formattedCurrentPrice}</span> • 
                Points: {priceHistory.length} • 
                <span className="ml-2 text-gray-500">
                  {market?.quoteDenom?.toUpperCase()}
                </span>
              </p>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Line chart showing market mid-price over time</p>
              <p className="mt-1">Auto-refresh: 1s • Hover to see values • 4 decimal precision</p>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">Building price chart...</p>
            <p className="text-sm text-gray-600 mt-1">
              Current price: <span className="font-medium text-white">{formattedCurrentPrice}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Collecting price data points...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}