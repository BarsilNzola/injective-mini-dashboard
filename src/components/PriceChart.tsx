import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time } from 'lightweight-charts'
import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { convertPriceFromApi, formatPrice } from '../utils/format'
import Loader from './Loader'

interface PriceChartProps {
  trades: FormattedTrade[]
  market: Market | null
  loading: boolean
  error: string | null
}

interface Timeframe {
  label: string
  value: number // milliseconds
  interval: string
}

// Available timeframes
const TIMEFRAMES: Timeframe[] = [
  { label: '1m', value: 60 * 1000, interval: '1 minute' },
  { label: '5m', value: 5 * 60 * 1000, interval: '5 minutes' },
  { label: '15m', value: 15 * 60 * 1000, interval: '15 minutes' },
  { label: '1H', value: 60 * 60 * 1000, interval: '1 hour' },
  { label: '4H', value: 4 * 60 * 60 * 1000, interval: '4 hours' },
  { label: '1D', value: 24 * 60 * 60 * 1000, interval: '1 day' },
]

// Type for the candlestick data
interface CandlestickData {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

export default function PriceChart({ trades, market, loading, error }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(TIMEFRAMES[2]) // Default to 15m
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // Get the latest trade for current price display
  const latestTrade = useMemo(() => {
    return trades[0] || null
  }, [trades])

  // Process trades into candlestick data - SHOW ALL CANDLES BUT LIMIT TO REASONABLE AMOUNT
  const candlestickData = useMemo(() => {
    if (!market || trades.length === 0) return []
    
    // Group trades into intervals based on selected timeframe
    const interval = selectedTimeframe.value
    const groupedTrades: { [key: string]: FormattedTrade[] } = {}
    
    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp)
    
    sortedTrades.forEach(trade => {
      const intervalStart = Math.floor(trade.timestamp / interval) * interval
      const intervalKey = intervalStart.toString()
      
      if (!groupedTrades[intervalKey]) {
        groupedTrades[intervalKey] = []
      }
      
      groupedTrades[intervalKey].push(trade)
    })
    
    // Convert grouped trades to candlestick data
    const candlesticks: CandlestickData[] = []
    
    // Get sorted interval keys
    const sortedIntervalKeys = Object.keys(groupedTrades).sort((a, b) => parseInt(a) - parseInt(b))
    
    sortedIntervalKeys.forEach((intervalKey) => {
      const intervalStart = parseInt(intervalKey)
      const intervalTrades = groupedTrades[intervalKey]
      
      if (intervalTrades.length === 0) return
      
      // Convert all prices for this interval using the same logic as PriceWidget
      const prices = intervalTrades.map(trade => 
        convertPriceFromApi(trade.price, market.baseDenom, market.quoteDenom)
      ).filter(price => !isNaN(price) && price > 0)
      
      if (prices.length === 0) return
      
      const open = prices[0]
      const close = prices[prices.length - 1]
      const high = Math.max(...prices)
      const low = Math.min(...prices)
      
      // Use the interval start as time (in seconds)
      const timeInSeconds = Math.floor(intervalStart / 1000)
      
      candlesticks.push({
        time: timeInSeconds as Time,
        open,
        high,
        low,
        close,
      })
    })
    
    // Debug: Check for duplicate timestamps
    const timestamps = candlesticks.map(c => c.time as number)
    const uniqueTimestamps = new Set(timestamps)
    if (timestamps.length !== uniqueTimestamps.size) {
      // Make timestamps unique by adding 1 second increments for duplicates
      const seen = new Set()
      const uniqueCandlesticks = candlesticks.map((candle) => {
        let time = candle.time as number
        while (seen.has(time)) {
          time += 1 // Add 1 second if duplicate
        }
        seen.add(time)
        return { ...candle, time: time as Time }
      })
      return uniqueCandlesticks.slice(-200) // Increased from 100 to 200
    }
    
    return candlesticks.slice(-200) // Increased from 100 to 200
  }, [trades, market, selectedTimeframe])

  // Initialize chart - WITH TIMEFRAME DEPENDENCY
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Clear previous chart if exists
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        minimumWidth: 80,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8, // Slightly wider for better visibility
        minBarSpacing: 2,
        rightOffset: 5,
        fixLeftEdge: false,
        fixRightEdge: false,
        visible: true,
        ticksVisible: true,
      },
      crosshair: {
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: false,
        },
        horzLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: false,
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

    // Create candlestick series with proper price formatting
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: 3,
        minMove: 0.001,
      },
    })

    chartRef.current = chart
    seriesRef.current = candleSeries

    // Handle resize
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
  }, []) // Keep empty dependencies - chart should initialize once

  // Update chart data when candlestickData or timeframe changes
  useEffect(() => {
    if (seriesRef.current && candlestickData.length > 0) {
      try {
        // Clear existing data and set new data
        seriesRef.current.setData(candlestickData)
        
        // Fit content to show all candles
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
          
          // Add a small timeout to ensure chart is properly rendered
          setTimeout(() => {
            if (chartRef.current) {
              chartRef.current.timeScale().fitContent()
            }
          }, 50)
        }
      } catch (error) {
        console.error('Error setting chart data:', error)
      }
    }
  }, [candlestickData]) // Only depend on candlestickData

  // Calculate statistics
  const stats = useMemo(() => {
    if (candlestickData.length === 0 || !market || !latestTrade) {
      return {
        currentPrice: '0',
        priceChange: 0,
        priceChangePercent: 0,
        periodHigh: '0',
        periodLow: '0',
        bullishCount: 0,
        bearishCount: 0
      }
    }

    const currentPrice = candlestickData[candlestickData.length - 1]?.close || 0
    const previousPrice = candlestickData[candlestickData.length - 2]?.close || currentPrice
    const priceChange = currentPrice - previousPrice
    const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0
    
    // Get tick size from market
    const tickSize = market?.minPriceTickSize || 0.0001
    
    // Format current price using the same logic as PriceWidget
    const formattedCurrentPrice = formatPrice(
      latestTrade.price,
      tickSize,
      market.baseDenom,
      market.quoteDenom
    )
    
    const periodHigh = Math.max(...candlestickData.map(c => c.high))
    const periodLow = Math.min(...candlestickData.map(c => c.low))
    
    // Format high/low prices
    let formattedPeriodHigh = periodHigh.toFixed(3)
    let formattedPeriodLow = periodLow.toFixed(3)
    
    if (periodHigh < 0.0001) {
      formattedPeriodHigh = periodHigh.toFixed(6)
    } else if (periodHigh < 1) {
      formattedPeriodHigh = periodHigh.toFixed(4)
    } else if (periodHigh < 1000) {
      formattedPeriodHigh = periodHigh.toFixed(3)
    } else if (periodHigh < 10000) {
      formattedPeriodHigh = periodHigh.toFixed(2)
    } else {
      formattedPeriodHigh = periodHigh.toFixed(1)
    }
    
    if (periodLow < 0.0001) {
      formattedPeriodLow = periodLow.toFixed(6)
    } else if (periodLow < 1) {
      formattedPeriodLow = periodLow.toFixed(4)
    } else if (periodLow < 1000) {
      formattedPeriodLow = periodLow.toFixed(3)
    } else if (periodLow < 10000) {
      formattedPeriodLow = periodLow.toFixed(2)
    } else {
      formattedPeriodLow = periodLow.toFixed(1)
    }
    
    const bullishCount = candlestickData.filter(c => c.close >= c.open).length
    const bearishCount = candlestickData.length - bullishCount

    return {
      currentPrice: formattedCurrentPrice,
      priceChange,
      priceChangePercent,
      periodHigh: formattedPeriodHigh,
      periodLow: formattedPeriodLow,
      bullishCount,
      bearishCount
    }
  }, [candlestickData, market, latestTrade])

  // Handle timeframe change - SIMPLIFIED
  const handleTimeframeChange = useCallback((timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe)
    setShowTimeframeDropdown(false)
    // Chart will re-render automatically because candlestickData depends on selectedTimeframe
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showTimeframeDropdown) {
        setShowTimeframeDropdown(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showTimeframeDropdown])

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
        <p className="text-red-400">Error loading chart data: {error}</p>
      </div>
    )
  }

  if (!market || candlestickData.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Price Chart</h3>
          <p className="text-gray-500">Collecting trade data for chart...</p>
          <p className="text-sm text-gray-600 mt-2">Need more trades to generate chart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">Price Chart</h3>
          <p className="text-sm text-gray-400">
            {market.ticker} • {selectedTimeframe.interval} intervals • {candlestickData.length} candles
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTimeframeDropdown(!showTimeframeDropdown)
              }}
              className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors min-w-[80px]"
            >
              <span className="text-gray-300">{selectedTimeframe.label}</span>
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
          
          {/* Current Price */}
          <div className="text-right">
            <div className="text-sm text-gray-400">Current Price</div>
            <div className={`text-xl font-bold ${stats.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.currentPrice}
            </div>
            <div className={`text-sm font-semibold ${stats.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(3)} 
              <span className="ml-2">
                ({stats.priceChange >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="h-64 rounded-lg overflow-hidden bg-gray-900/30"
        style={{ 
          minHeight: '256px',
          position: 'relative',
          zIndex: 1
        }}
      />
      
      {/* Chart Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Period High</div>
            <div className="text-green-400 font-semibold">
              {stats.periodHigh}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Period Low</div>
            <div className="text-red-400 font-semibold">
              {stats.periodLow}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Bullish</div>
            <div className="text-green-400 font-semibold">
              {stats.bullishCount}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Bearish</div>
            <div className="text-red-400 font-semibold">
              {stats.bearishCount}
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeframe Legend */}
      <div className="mt-4 flex justify-center space-x-2">
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
  )
}