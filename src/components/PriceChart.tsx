import { useState, useEffect, useRef, useMemo } from 'react'
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  Time,
} from 'lightweight-charts'
import { Market } from '../types'
import { injectiveClient } from '../api/injectiveClient'
import Loader from './Loader'

interface PriceChartProps {
  market: Market | null
  loading: boolean
  error: string | null
}

interface OhlcCandle {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

interface Timeframe {
  label: string
  ms: number
  interval: string
}

const TIMEFRAMES: Timeframe[] = [
  { label: '1m',  ms: 60 * 1000,          interval: '1 minute'   },
  { label: '5m',  ms: 5 * 60 * 1000,      interval: '5 minutes'  },
  { label: '15m', ms: 15 * 60 * 1000,     interval: '15 minutes' },
  { label: '1H',  ms: 60 * 60 * 1000,     interval: '1 hour'     },
  { label: '4H',  ms: 4 * 60 * 60 * 1000, interval: '4 hours'    },
  { label: '1D',  ms: 24 * 60 * 60 * 1000,interval: '1 day'      },
]

// Accumulates raw price ticks into OHLC candles for a given timeframe
function buildCandles(ticks: { time: number; price: number }[], timeframeMs: number): OhlcCandle[] {
  if (ticks.length === 0) return []

  const buckets = new Map<number, { open: number; high: number; low: number; close: number }>()

  for (const tick of ticks) {
    const bucketTime = Math.floor(tick.time / timeframeMs) * timeframeMs

    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
      })
    } else {
      const candle = buckets.get(bucketTime)!
      candle.high = Math.max(candle.high, tick.price)
      candle.low = Math.min(candle.low, tick.price)
      candle.close = tick.price
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, ohlc]) => ({
      time: Math.floor(time / 1000) as Time,
      ...ohlc,
    }))
}

export default function PriceChart({ market, loading, error }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(TIMEFRAMES[0])
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)
  const [candles, setCandles] = useState<OhlcCandle[]>([])
  const [currentPrice, setCurrentPrice] = useState<string>('—')
  const [hoveredCandle, setHoveredCandle] = useState<OhlcCandle | null>(null)

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const ticksRef = useRef<{ time: number; price: number }[]>([])

  // Reset on market change
  useEffect(() => {
    ticksRef.current = []
    setCandles([])
    setCurrentPrice('—')
    setHoveredCandle(null)
  }, [market?.id])

  // Poll Pyth Hermes every 1s for live price
  useEffect(() => {
    if (!market) return

    const poll = async () => {
      const { price } = await injectiveClient.getCurrentPrice(market)
      if (price === '0') return

      const num = parseFloat(price)
      if (isNaN(num)) return

      // Format current price display
      const formatted = num >= 10_000
        ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : num >= 1 ? num.toFixed(4)
        : num.toPrecision(4)
      setCurrentPrice(formatted)

      // Accumulate tick — cap at 10k points to avoid memory growth
      ticksRef.current = [...ticksRef.current, { time: Date.now(), price: num }].slice(-10000)
      setCandles(buildCandles(ticksRef.current, selectedTimeframe.ms))
    }

    poll()
    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [market, selectedTimeframe.ms])

  // Rebuild candles when timeframe changes
  useEffect(() => {
    setCandles(buildCandles(ticksRef.current, selectedTimeframe.ms))
  }, [selectedTimeframe])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !market) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      crosshair: {
        vertLine: { color: '#4B5563', labelBackgroundColor: '#374151' },
        horzLine: { color: '#4B5563', labelBackgroundColor: '#374151' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: true,
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor:          '#10B981',
      downColor:        '#EF4444',
      borderUpColor:    '#10B981',
      borderDownColor:  '#EF4444',
      wickUpColor:      '#10B981',
      wickDownColor:    '#EF4444',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    })

    // OHLC tooltip on crosshair move
    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time || !seriesRef.current) {
        setHoveredCandle(null)
        return
      }
      const data = param.seriesData.get(seriesRef.current) as OhlcCandle | undefined
      setHoveredCandle(data ?? null)
    })

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [market])

  // Push candle updates to chart without recreating it
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return
    seriesRef.current.setData(candles)
    chartRef.current?.timeScale().scrollToRealTime()
  }, [candles])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.timeframe-dropdown')) {
        setShowTimeframeDropdown(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const stats = useMemo(() => {
    if (candles.length === 0) return null
    const first = candles[0]
    const last = candles[candles.length - 1]
    const change = last.close - first.open
    const pct = (change / first.open) * 100
    return {
      open:  first.open,
      high:  Math.max(...candles.map(c => c.high)),
      low:   Math.min(...candles.map(c => c.low)),
      close: last.close,
      change,
      pct,
    }
  }, [candles])

  const fmt = (n: number) =>
    n >= 10_000
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n >= 1 ? n.toFixed(4)
      : n.toPrecision(4)

  if (loading && candles.length === 0) {
    return <div className="bg-gray-800/50 rounded-xl p-6 h-96"><Loader /></div>
  }

  if (error && candles.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 h-96 flex items-center justify-center text-red-400">
        {error}
      </div>
    )
  }

  if (!market) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 h-96 flex items-center justify-center text-gray-500">
        Select a market
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">{market.ticker}</h3>
          <p className="text-sm text-gray-500">
            {selectedTimeframe.interval} • {candles.length} candles
          </p>
        </div>

        <div className="flex items-center gap-4">

          {/* Timeframe selector */}
          <div className="relative timeframe-dropdown">
            <div className="flex gap-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.label}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedTimeframe.label === tf.label
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current price */}
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">Last Price</div>
            <div className="text-xl font-bold font-mono text-white">
              {currentPrice}
            </div>
            <div className="text-xs text-gray-500">{market.quoteSymbol}</div>
          </div>
        </div>
      </div>

      {/* OHLC tooltip — shows on crosshair hover, hidden otherwise */}
      <div className="flex gap-4 text-xs font-mono mb-3 h-4">
        {hoveredCandle ? (
          <>
            <span className="text-gray-500">O <span className="text-white">{fmt(hoveredCandle.open)}</span></span>
            <span className="text-gray-500">H <span className="text-green-400">{fmt(hoveredCandle.high)}</span></span>
            <span className="text-gray-500">L <span className="text-red-400">{fmt(hoveredCandle.low)}</span></span>
            <span className="text-gray-500">C <span className="text-white">{fmt(hoveredCandle.close)}</span></span>
            <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-green-400' : 'text-red-400'}>
              {hoveredCandle.close >= hoveredCandle.open ? '+' : ''}
              {fmt(hoveredCandle.close - hoveredCandle.open)}
            </span>
          </>
        ) : (
          <span className="text-gray-600">Hover over a candle for OHLC details</span>
        )}
      </div>

      {/* Chart */}
      {candles.length === 0 ? (
        <div className="w-full h-96 flex flex-col items-center justify-center text-gray-500 gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-sm">Collecting price data...</span>
          <span className="text-xs text-gray-600">Candles form as ticks arrive</span>
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full h-96" />
      )}

      {/* Stats bar */}
      {stats && (
        <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono">
          <span className="text-gray-500">O <span className="text-gray-300">{fmt(stats.open)}</span></span>
          <span className="text-gray-500">H <span className="text-green-400">{fmt(stats.high)}</span></span>
          <span className="text-gray-500">L <span className="text-red-400">{fmt(stats.low)}</span></span>
          <span className="text-gray-500">C <span className="text-gray-300">{fmt(stats.close)}</span></span>
          <span className={stats.change >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stats.change >= 0 ? '+' : ''}{fmt(stats.change)} ({stats.pct.toFixed(2)}%)
          </span>
          <span className="text-gray-600 ml-auto">{candles.length} candles • {ticksRef.current.length} ticks</span>
        </div>
      )}
    </div>
  )
}