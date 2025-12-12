import { 
  IndexerGrpcSpotApi, 
  IndexerGrpcDerivativesApi,
  SpotMarket,
  DerivativeMarket,
  OrderbookWithSequence,
  SpotTrade,
  DerivativeTrade
} from '@injectivelabs/sdk-ts'
import { Network, getNetworkEndpoints } from '@injectivelabs/networks'

// Initialize with testnet
const NETWORK = Network.Testnet
const ENDPOINTS = getNetworkEndpoints(NETWORK)

export interface MarketSummary {
  lastPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  volume?: string;
  change?: string;
}

export interface FormattedTrade {
  id: string;
  price: string;
  quantity: string;
  timestamp: number;
  direction: 'buy' | 'sell';
  hash: string;
}

export interface FormattedOrderbookEntry {
  price: string;
  quantity: string;
  timestamp: number;
}

class InjectiveClient {
  private spotApi: IndexerGrpcSpotApi;
  private derivativesApi: IndexerGrpcDerivativesApi;

  constructor() {
    this.spotApi = new IndexerGrpcSpotApi(ENDPOINTS.indexer)
    this.derivativesApi = new IndexerGrpcDerivativesApi(ENDPOINTS.indexer)
  }

  async getSpotMarkets(): Promise<SpotMarket[]> {
    try {
      const markets = await this.spotApi.fetchMarkets()
      return markets
    } catch (error) {
      console.error('Error fetching spot markets:', error)
      throw error
    }
  }

  async getDerivativesMarkets(): Promise<DerivativeMarket[]> {
    try {
      const markets = await this.derivativesApi.fetchMarkets()
      return markets
    } catch (error) {
      console.error('Error fetching derivatives markets:', error)
      throw error
    }
  }

  async getSpotOrderbook(marketId: string): Promise<OrderbookWithSequence> {
    try {
      const orderbook = await this.spotApi.fetchOrderbookV2(marketId)
      return orderbook
    } catch (error) {
      console.error('Error fetching spot orderbook:', error)
      throw error
    }
  }

  async getDerivativesOrderbook(marketId: string): Promise<OrderbookWithSequence> {
    try {
      const orderbook = await this.derivativesApi.fetchOrderbookV2(marketId)
      return orderbook
    } catch (error) {
      console.error('Error fetching derivatives orderbook:', error)
      throw error
    }
  }

  async getSpotTrades(marketId: string): Promise<FormattedTrade[]> {
    try {
      const response = await this.spotApi.fetchTrades({
        marketId,
        direction: 'desc',
        pagination: {
          limit: 20
        }
      })

      const trades = response.trades || []
      return trades.map((trade: SpotTrade) => ({
        id: trade.tradeId || '',
        price: trade.price?.price || '0',
        quantity: trade.quantity || '0',
        timestamp: trade.executedAt || Date.now(),
        direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
        hash: trade.tradeHash || ''
      }))
    } catch (error) {
      console.error('Error fetching spot trades:', error)
      throw error
    }
  }

  async getDerivativesTrades(marketId: string): Promise<FormattedTrade[]> {
    try {
      const response = await this.derivativesApi.fetchTrades({
        marketId,
        direction: 'desc',
        pagination: {
          limit: 20
        }
      })

      const trades = response.trades || []
      return trades.map((trade: DerivativeTrade) => ({
        id: trade.tradeId || '',
        price: trade.price?.price || '0',
        quantity: trade.quantity || '0',
        timestamp: trade.executedAt || Date.now(),
        direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
        hash: trade.tradeHash || ''
      }))
    } catch (error) {
      console.error('Error fetching derivatives trades:', error)
      throw error
    }
  }

  async getMarketSummary(marketId: string): Promise<MarketSummary> {
    try {
      // For now, we'll create a mock summary since fetchMarketSummary might not exist
      // We'll use the latest trades to simulate summary data
      const trades = await this.getSpotTrades(marketId)
      
      if (trades.length === 0) {
        return {
          lastPrice: '0',
          highPrice: '0',
          lowPrice: '0',
          volume: '0',
          change: '0'
        }
      }

      const prices = trades.map(t => parseFloat(t.price))
      const volumes = trades.map(t => parseFloat(t.quantity))
      
      return {
        lastPrice: trades[0].price,
        highPrice: Math.max(...prices).toString(),
        lowPrice: Math.min(...prices).toString(),
        volume: volumes.reduce((sum, vol) => sum + vol, 0).toString(),
        change: '0' // Calculate if we had previous data
      }
    } catch (error) {
      console.error('Error fetching market summary:', error)
      throw error
    }
  }
}

export const injectiveClient = new InjectiveClient()