import { FormattedTrade } from '../api/injectiveClient'
import { Market } from '../types'
import { formatPrice, convertPriceFromApi } from '../utils/format'
import Loader from './Loader'
import { useState, useEffect, useRef, useMemo } from 'react'

interface PriceWidgetProps {
  trades: FormattedTrade[]
  market: Market | null
  loading: boolean
  error: string | null
}

export default function PriceWidget({ trades, market, loading, error }: PriceWidgetProps) {
  // Extract just the price from the first trade for reactivity
  const latestPrice = trades[0]?.price || '0'
  const latestTimestamp = trades[0]?.timestamp || 0
  const tickSize = market?.minPriceTickSize || 0.0001
  
  // Track previous values for animation
  const [isUpdating, setIsUpdating] = useState(false)
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'none'>('none')
  const previousPriceRef = useRef<string>('')
  const previousTimestampRef = useRef<number>(0)
  const updateCountRef = useRef(0)

  // Format the price - this will recalculate when any dependency changes
  const formattedPrice = useMemo(() => {
    if (!latestPrice || latestPrice === '0') return '0'
    return formatPrice(latestPrice, market?.baseDenom, market?.quoteDenom) // Removed tickSize argument
  }, [latestPrice, market?.baseDenom, market?.quoteDenom])

  // Animation effect - trigger on any price or timestamp change
  useEffect(() => {
    const priceChanged = latestPrice !== previousPriceRef.current
    const timeChanged = latestTimestamp !== previousTimestampRef.current
    
    if ((priceChanged || timeChanged) && latestPrice !== '0' && previousPriceRef.current !== '0') {
      setIsUpdating(true)
      
      // Determine price direction for animation
      const prevPriceNum = parseFloat(previousPriceRef.current) || 0
      const currentPriceNum = parseFloat(latestPrice) || 0
      const direction = currentPriceNum > prevPriceNum ? 'up' : currentPriceNum < prevPriceNum ? 'down' : 'none'
      setPriceDirection(direction)
      
      updateCountRef.current += 1
      console.log(`PriceWidget update #${updateCountRef.current}:`, {
        oldPrice: previousPriceRef.current,
        newPrice: latestPrice,
        formatted: formattedPrice,
        direction,
        oldTime: new Date(previousTimestampRef.current).toISOString(),
        newTime: new Date(latestTimestamp).toISOString()
      })
      
      const timer = setTimeout(() => {
        setIsUpdating(false)
        setPriceDirection('none')
      }, 500)
      
      previousPriceRef.current = latestPrice
      previousTimestampRef.current = latestTimestamp
      return () => clearTimeout(timer)
    }
    
    // Always update refs
    previousPriceRef.current = latestPrice
    previousTimestampRef.current = latestTimestamp
  }, [latestPrice, latestTimestamp, formattedPrice])

  // Calculate 24h stats - memoized for performance
  const { highPrice, lowPrice } = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentTrades = trades.filter(trade => {
      const tradePrice = parseFloat(trade.price)
      return trade.timestamp > twentyFourHoursAgo && !isNaN(tradePrice) && tradePrice > 0
    })
    
    let high = parseFloat(formattedPrice) || 0
    let low = parseFloat(formattedPrice) || 0
    
    if (recentTrades.length > 0) {
      const prices = recentTrades.map(t => 
        convertPriceFromApi(t.price, market?.baseDenom, market?.quoteDenom)
      ).filter(p => !isNaN(p) && p > 0)
      
      if (prices.length > 0) {
        high = Math.max(...prices)
        low = Math.min(...prices)
      }
    }
    
    return { highPrice: high, lowPrice: low }
  }, [trades, formattedPrice, market?.baseDenom, market?.quoteDenom])

  // Determine animation class based on price direction
  const priceAnimationClass = useMemo(() => {
    if (!isUpdating) return ''
    return priceDirection === 'up' ? 'price-up' : priceDirection === 'down' ? 'price-down' : ''
  }, [isUpdating, priceDirection])

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
        <p className="text-red-400">Error loading price: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-300">Current Price</h2>
            {!loading && latestPrice !== '0' && (
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="ml-1 text-xs text-green-400">LIVE</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400">{market?.ticker || 'Select a market'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Last Updated</div>
          <div className="text-sm text-gray-300">
            {latestTimestamp ? new Date(latestTimestamp).toLocaleTimeString() : '--:--:--'}
          </div>
        </div>
      </div>
      
      <div className="text-center py-4">
        <div className={`text-4xl font-bold mb-2 transition-all duration-300 ${
          isUpdating ? 'scale-105' : ''
        } ${priceAnimationClass}`}>
          {loading && trades.length === 0 ? (
            <div className="h-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : latestPrice === '0' ? (
            <div className="text-xl text-gray-500">No price data</div>
          ) : (
            formattedPrice
          )}
        </div>
        <div className="text-sm text-gray-400">
          {market?.quoteDenom || ''}
        </div>
      </div>
      
      {latestPrice !== '0' && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">24h High</span>
            <span className="text-green-400">{highPrice.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">24h Low</span>
            <span className="text-red-400">{lowPrice.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  )
}