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

interface LineData {
  time: Time
  value: number
}

export default function PriceChart({ orderbook, market, loading, error }: PriceChartProps) {
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
          
          // Keep last 300 points (5 minutes at 1-second intervals)
          if (updated.length > 300) {
            return updated.slice(-300)
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

  // Initialize chart
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
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: true,
        rightBarStaysOnScroll: true,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 0.5,
        fixLeftEdge: true,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        visible: true,
        borderVisible: true,
        ticksVisible: true,
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
        mode: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      }
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 2,
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
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

  // Update chart data when price history changes
  useEffect(() => {
    if (seriesRef.current && chartRef.current && priceHistory.length > 0) {
      try {
        seriesRef.current.setData(priceHistory)
        
        // Fit content and scroll to end
        chartRef.current.timeScale().fitContent()
        chartRef.current.timeScale().scrollToRealTime()
        
      } catch (error) {
        console.error('Error updating chart:', error)
      }
    }
  }, [priceHistory])

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
        
        /* Make time scale more visible */
        .tv-time-scale,
        .time-scale {
          font-size: 11px !important;
          color: #9CA3AF !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">Price Chart</h3>
          <p className="text-sm text-gray-400">
            {market.ticker} • Real-time • {priceHistory.length} points
          </p>
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
      
      <div 
        ref={chartContainerRef} 
        className="h-64 rounded-lg overflow-hidden bg-gray-900/30 cursor-crosshair"
        style={{ 
          minHeight: '256px',
          position: 'relative',
          zIndex: 1
        }}
        title="Mouse wheel: Zoom • Drag: Pan"
      />
      
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        {hasPriceData ? (
          <>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                <p>Last 5 minutes • Updates: 1s</p>
                <p className="mt-1 text-xs">Points: {priceHistory.length} • {formatPriceToFourDecimals(currentPrice)} {market?.quoteDenom?.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p>Price Range: {priceHistory.length > 0 ? 
                  `${formatPriceToFourDecimals(Math.min(...priceHistory.map(p => p.value)))} - ${formatPriceToFourDecimals(Math.max(...priceHistory.map(p => p.value)))}` 
                  : 'Calculating...'}
                </p>
                <p className="mt-1 text-xs">
                  Use mouse wheel to zoom • Drag to pan
                </p>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Real-time mid-price from order book • Hover for exact values</p>
              <p className="mt-1">Time shows in local timezone • 4 decimal precision</p>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">Building price chart...</p>
            <p className="text-sm text-gray-600 mt-1">
              Current price: <span className="font-medium text-white">{formattedCurrentPrice}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Collecting price data points (updates every second)...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}