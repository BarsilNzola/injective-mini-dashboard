import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps
} from 'recharts'
import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { convertPriceFromApi } from '../utils/format'
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

interface CandlestickData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
  isBullish: boolean
}

interface CandlestickTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: any[]
  label?: string
}

interface CandlestickBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  low: number
  high: number
  open: number
  close: number
  isBullish: boolean
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

const CandlestickTooltip: React.FC<CandlestickTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CandlestickData
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg min-w-[180px]">
        <p className="text-sm text-gray-400 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Open:</span>
            <span className="text-gray-300">{data.open.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">High:</span>
            <span className="text-green-400">{data.high.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Low:</span>
            <span className="text-red-400">{data.low.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Close:</span>
            <span className={`font-semibold ${data.isBullish ? 'text-green-400' : 'text-red-400'}`}>
              {data.close.toFixed(6)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Change:</span>
            <span className={`font-semibold ${data.isBullish ? 'text-green-400' : 'text-red-400'}`}>
              {data.isBullish ? '+' : ''}{((data.close - data.open) / data.open * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Volume:</span>
            <span className="text-blue-400">{data.volume.toFixed(4)}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CandlestickBar: React.FC<CandlestickBarProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, low, high, open, close, isBullish } = props
  
  if (!width || !height) return null
  
  // Candlestick calculations
  const candleTop = Math.min(open, close)
  const candleBottom = Math.max(open, close)
  const candleHeight = Math.abs(close - open)
  
  // Colors
  const candleColor = isBullish ? '#10B981' : '#EF4444'
  const wickColor = isBullish ? '#10B981' : '#EF4444'
  
  // Calculate positions relative to chart coordinates
  const maxValue = Math.max(high, low, open, close)
  
  return (
    <g>
      {/* Top wick */}
      <line
        x1={x + width / 2}
        y1={y + (high - maxValue)}
        x2={x + width / 2}
        y2={y + (candleTop - maxValue)}
        stroke={wickColor}
        strokeWidth={1}
      />
      
      {/* Candle body */}
      <rect
        x={x + width * 0.25}
        y={y + (candleTop - maxValue)}
        width={width * 0.5}
        height={Math.max(candleHeight, 1)}
        fill={candleColor}
        stroke={candleColor}
      />
      
      {/* Bottom wick */}
      <line
        x1={x + width / 2}
        y1={y + (candleBottom - maxValue)}
        x2={x + width / 2}
        y2={y + (low - maxValue)}
        stroke={wickColor}
        strokeWidth={1}
      />
    </g>
  )
}

export default function PriceChart({ trades, market, loading, error }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(TIMEFRAMES[0])
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false)

  // Process trades into candlestick data based on selected timeframe
  const candlestickData = useMemo((): CandlestickData[] => {
    if (!market || trades.length === 0) return []
    
    // Group trades into intervals based on selected timeframe
    const interval = selectedTimeframe.value
    const groupedTrades: { [key: number]: FormattedTrade[] } = {}
    
    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp)
    
    sortedTrades.forEach(trade => {
      const intervalStart = Math.floor(trade.timestamp / interval) * interval
      
      if (!groupedTrades[intervalStart]) {
        groupedTrades[intervalStart] = []
      }
      
      groupedTrades[intervalStart].push(trade)
    })
    
    // Convert grouped trades to candlestick data
    const candlesticks: CandlestickData[] = []
    
    Object.keys(groupedTrades).sort().forEach(intervalStartStr => {
      const intervalStart = parseInt(intervalStartStr)
      const intervalTrades = groupedTrades[intervalStart]
      
      if (intervalTrades.length === 0) return
      
      // Convert all prices for this interval
      const prices = intervalTrades.map(trade => 
        convertPriceFromApi(trade.price, market.baseDenom, market.quoteDenom)
      ).filter(price => !isNaN(price) && price > 0)
      
      if (prices.length === 0) return
      
      const open = prices[0]
      const close = prices[prices.length - 1]
      const high = Math.max(...prices)
      const low = Math.min(...prices)
      const volume = intervalTrades.reduce((sum, trade) => 
        sum + convertPriceFromApi(trade.quantity, market.baseDenom, ''), 0
      )
      
      // Format time label based on timeframe
      let timeLabel = ''
      const date = new Date(intervalStart)
      
      switch (selectedTimeframe.value) {
        case TIMEFRAMES[0].value: // 1m
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          break
        case TIMEFRAMES[1].value: // 5m
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          break
        case TIMEFRAMES[2].value: // 15m
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          break
        case TIMEFRAMES[3].value: // 1H
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          break
        case TIMEFRAMES[4].value: // 4H
          timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' })
          break
        case TIMEFRAMES[5].value: // 1D
          timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
          break
        default:
          timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      candlesticks.push({
        time: timeLabel,
        open,
        high,
        low,
        close,
        volume,
        timestamp: intervalStart,
        isBullish: close >= open
      })
    })
    
    // Return last 30 candlesticks (more for longer timeframes)
    const maxCandles = selectedTimeframe.value >= TIMEFRAMES[4].value ? 20 : 30
    return candlesticks.slice(-maxCandles)
  }, [trades, market, selectedTimeframe])

  // Get price range for Y-axis
  const priceRange = useMemo(() => {
    if (candlestickData.length === 0) return { min: 0, max: 0 }
    
    const allPrices = candlestickData.flatMap(c => [c.low, c.high, c.open, c.close])
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    
    // Add some padding
    const padding = (max - min) * 0.05
    
    return {
      min: min - padding,
      max: max + padding
    }
  }, [candlestickData])

  // Calculate current price from latest trade
  const currentPrice = candlestickData[candlestickData.length - 1]?.close || 0
  const previousPrice = candlestickData[candlestickData.length - 2]?.close || currentPrice
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0

  // Handle timeframe change
  const handleTimeframeChange = useCallback((timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe)
    setShowTimeframeDropdown(false)
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
          <p className="text-gray-500">Collecting trade data for candlesticks...</p>
          <p className="text-sm text-gray-600 mt-2">Need more trades to generate chart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-300">Candlestick Chart</h3>
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
            <div className={`text-xl font-bold ${currentPrice >= previousPrice ? 'text-green-400' : 'text-red-400'}`}>
              {currentPrice.toFixed(6)}
            </div>
            <div className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(6)} 
              <span className="ml-2">
                ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={candlestickData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#374151" 
              horizontal={true}
              vertical={false}
            />
            <ReferenceLine 
              y={currentPrice} 
              stroke="#6B7280" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tick={{ fill: '#9CA3AF' }}
              minTickGap={15}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tick={{ fill: '#9CA3AF' }}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => value.toFixed(4)}
              width={70}
              orientation="right"
            />
            <Tooltip content={<CandlestickTooltip />} />
            
            {/* Candlestick bars */}
            <Bar
              dataKey="high"
              shape={(props: any) => <CandlestickBar {...props} />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Period High</div>
            <div className="text-green-400 font-semibold">
              {Math.max(...candlestickData.map(c => c.high)).toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Period Low</div>
            <div className="text-red-400 font-semibold">
              {Math.min(...candlestickData.map(c => c.low)).toFixed(6)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Bullish</div>
            <div className="text-green-400 font-semibold">
              {candlestickData.filter(c => c.isBullish).length}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Bearish</div>
            <div className="text-red-400 font-semibold">
              {candlestickData.filter(c => !c.isBullish).length}
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