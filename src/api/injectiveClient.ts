import { 
  IndexerGrpcSpotApi, 
  IndexerGrpcDerivativesApi,
  SpotMarket,
  DerivativeMarket,
  DerivativeTrade,
  IndexerGrpcOracleApi,
  PriceLevel
} from '@injectivelabs/sdk-ts'
import { Network, getNetworkEndpoints } from '@injectivelabs/networks'
import { Market } from '../types'
import { resolvePythFeedId } from '../config/pythPriceIds'

const NETWORK = (import.meta as any).env?.VITE_INJECTIVE_NETWORK === 'mainnet' 
  ? Network.Mainnet 
  : Network.Testnet

const ENDPOINTS = getNetworkEndpoints(NETWORK)

const HERMES_URL = 'https://hermes.pyth.network'

function normalizeTicker(ticker: string): { base: string; quote: string } | null {
  if (!ticker) return null
  const cleaned = ticker
    .toUpperCase()
    .replace(/\s*(PERP|SPOT|FUTURES|SWAP)\s*/g, '')
    .trim()
  const parts = cleaned.split('/')
  if (parts.length !== 2) return null
  const [base, quote] = parts.map(p => p.trim())
  if (!base || !quote) return null
  return { base, quote }
}

function extractSymbolFromDenom(denom: string): string {
  if (!denom) return ''
  if (denom.includes('inj') || denom.includes('INJ')) return 'INJ'
  if (denom.includes('usdt') || denom.includes('USDT')) return 'USDT'
  if (denom.includes('usdc') || denom.includes('USDC')) return 'USDC'
  if (denom.includes('atom') || denom.includes('ATOM')) return 'ATOM'
  if (denom.includes('btc') || denom.includes('BTC')) return 'BTC'
  if (denom.includes('eth') || denom.includes('ETH')) return 'ETH'
  if (denom.includes('sol') || denom.includes('SOL')) return 'SOL'
  if (denom.includes('peggy')) return 'USDT'
  if (denom.length > 12) return denom.slice(0, 4) + '...' + denom.slice(-4)
  return denom
}

export interface MarketSummary {
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  change: string;
}

export interface FormattedTrade {
  id: string;
  price: string;
  quantity: string;
  timestamp: number;
  direction: 'buy' | 'sell';
  hash: string;
}

export interface FormattedOrderbook {
  bids: PriceLevel[];
  asks: PriceLevel[];
}

class InjectiveClient {
  private spotApi: IndexerGrpcSpotApi;
  private derivativesApi: IndexerGrpcDerivativesApi;
  private oracleApi: IndexerGrpcOracleApi;
  private network: Network;

  constructor() {
    this.network = NETWORK
    this.spotApi = new IndexerGrpcSpotApi(ENDPOINTS.indexer)
    this.derivativesApi = new IndexerGrpcDerivativesApi(ENDPOINTS.indexer)
    this.oracleApi = new IndexerGrpcOracleApi(ENDPOINTS.indexer)
    console.log(`InjectiveClient initialized on ${this.network}`)
  }

  async getSpotMarkets(): Promise<Market[]> {
    try {
      const markets = await this.spotApi.fetchMarkets()
      return markets.map((market: SpotMarket): Market => {
        const normalized = normalizeTicker(market.ticker)
        return {
          id: market.marketId,
          ticker: market.ticker,
          baseSymbol: normalized?.base ?? extractSymbolFromDenom(market.baseDenom),
          quoteSymbol: normalized?.quote ?? extractSymbolFromDenom(market.quoteDenom),
          baseDenom: market.baseDenom,
          quoteDenom: market.quoteDenom,
          marketType: 'spot',
          minPriceTickSize: String(market.minPriceTickSize || '0.0001'),
          minQuantityTickSize: String(market.minQuantityTickSize || '0.001'),
          baseDecimals: (market as any).baseToken?.decimals ?? 18,
          quoteDecimals: (market as any).quoteToken?.decimals ?? 6,
        }
      })
    } catch (error) {
      console.error('Error fetching spot markets:', error)
      throw error
    }
  }

  async getDerivativesMarkets(): Promise<Market[]> {
    try {
      const markets = await this.derivativesApi.fetchMarkets()
      return markets.map((market: DerivativeMarket): Market => {
        const normalized = normalizeTicker(market.ticker)
        return {
          id: market.marketId,
          ticker: market.ticker,
          baseSymbol: normalized?.base ?? extractSymbolFromDenom(market.quoteDenom),
          quoteSymbol: normalized?.quote ?? extractSymbolFromDenom(market.quoteDenom),
          baseDenom: market.quoteDenom,
          quoteDenom: market.quoteDenom,
          marketType: 'derivative',
          minPriceTickSize: String(market.minPriceTickSize || '0.0001'),
          minQuantityTickSize: String(market.minQuantityTickSize || '0.001'),
          baseDecimals: 18,
          quoteDecimals: 6,
        }
      })
    } catch (error) {
      console.error('Error fetching derivatives markets:', error)
      throw error
    }
  }

  async getAllMarkets(): Promise<Market[]> {
    try {
      const [spotMarkets, derivativeMarkets] = await Promise.all([
        this.getSpotMarkets(),
        this.getDerivativesMarkets()
      ])
      return [...spotMarkets, ...derivativeMarkets]
    } catch (error) {
      console.error('Error fetching all markets:', error)
      return []
    }
  }

  async getSpotOrderbook(marketId: string): Promise<FormattedOrderbook> {
    try {
      const orderbook = await this.spotApi.fetchOrderbookV2(marketId) as any
      const bids = orderbook?.bids || orderbook?.buys || orderbook?.orderbook?.bids || []
      const asks = orderbook?.asks || orderbook?.sells || orderbook?.orderbook?.asks || []
      return {
        bids: Array.isArray(bids) ? bids : [],
        asks: Array.isArray(asks) ? asks : []
      }
    } catch (error) {
      console.error(`Error fetching spot orderbook for ${marketId}:`, error)
      return { bids: [], asks: [] }
    }
  }

  async getSpotTrades(marketId: string, limit: number = 50): Promise<FormattedTrade[]> {
    try {
      const response = await this.spotApi.fetchTrades({ marketId, pagination: { limit } })
      const trades = response.trades || []
      return trades.map((trade: any) => {
        let price = '0'
        if (trade.price) {
          price = typeof trade.price === 'string'
            ? trade.price
            : trade.price.price || trade.price.amount || '0'
        }
        let quantity = '0'
        if (trade.quantity) {
          quantity = typeof trade.quantity === 'string'
            ? trade.quantity
            : trade.quantity.amount || '0'
        }
        quantity = quantity !== '0' ? quantity : (trade.executionQuantity || '0')
        return {
          id: trade.tradeId || `${Date.now()}-${Math.random()}`,
          price,
          quantity,
          timestamp: trade.executedAt || Date.now(),
          direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
          hash: trade.tradeId || ''
        }
      })
    } catch (error) {
      console.error(`Error fetching spot trades for ${marketId}:`, error)
      return []
    }
  }

  async getDerivativesTrades(marketId: string, limit: number = 50): Promise<FormattedTrade[]> {
    try {
      const response = await this.derivativesApi.fetchTrades({ marketId, pagination: { limit } })
      const trades = response.trades || []
      return trades.map((trade: DerivativeTrade) => ({
        id: trade.tradeId || `${Date.now()}-${Math.random()}`,
        price: trade.executionPrice || '0',
        quantity: trade.executionQuantity || '0',
        timestamp: trade.executedAt || Date.now(),
        direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
        hash: trade.tradeId || ''
      }))
    } catch (error) {
      console.error(`Error fetching derivatives trades for ${marketId}:`, error)
      return []
    }
  }

  // Calls Pyth Hermes HTTP API directly using verified feed IDs from pythPriceIds config.
  // Works on both mainnet and testnet — Hermes is network-agnostic.
  async getPythHermesPrice(base: string, quote: string): Promise<string> {
    try {
      const feedId = await resolvePythFeedId(base)
  
      if (!feedId) {
        console.warn(`No Pyth feed ID found for ${base} — skipping`)
        return '0'
      }
  
      const response = await fetch(
        `${HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}&parsed=true`,
        { headers: { accept: 'application/json' } }
      )
  
      if (!response.ok) {
        console.error(`Hermes price fetch failed with ${response.status} for ${base}/${quote}`)
        return '0'
      }
  
      const data = await response.json()
      const parsed = data?.parsed?.[0]
  
      if (!parsed) return '0'
  
      // Hermes price format: { price: "303800000", expo: -8 } => 3.038
      const rawPrice = parseFloat(parsed.price?.price ?? '0')
      const expo = parseInt(parsed.price?.expo ?? '0', 10)
  
      if (isNaN(rawPrice) || rawPrice === 0) return '0'
  
      return (rawPrice * Math.pow(10, expo)).toString()
  
    } catch (error) {
      console.error(`Pyth Hermes error for ${base}/${quote}:`, error)
      return '0'
    }
  }

  async getCurrentPrice(market: Market): Promise<{ price: string; source: 'pyth' | 'none' }> {
    const { baseSymbol, quoteSymbol } = market

    if (!baseSymbol || !quoteSymbol) {
      console.warn(`Cannot fetch price: missing symbols for market ${market.ticker}`)
      return { price: '0', source: 'none' }
    }

    const price = await this.getPythHermesPrice(baseSymbol, quoteSymbol)
    if (price !== '0') return { price, source: 'pyth' }

    return { price: '0', source: 'none' }
  }

  getNetworkInfo(): { network: Network; endpoints: typeof ENDPOINTS } {
    return { network: this.network, endpoints: ENDPOINTS }
  }
}

export const injectiveClient = new InjectiveClient()

export const testConnection = async (): Promise<boolean> => {
  try {
    const markets = await injectiveClient.getAllMarkets()
    console.log(`Connected to Injective ${injectiveClient.getNetworkInfo().network}`)
    console.log(`Found ${markets.length} markets`)
    return true
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}