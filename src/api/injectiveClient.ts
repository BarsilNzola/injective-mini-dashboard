import { 
  IndexerGrpcSpotApi, 
  IndexerGrpcDerivativesApi,
  SpotMarket,
  DerivativeMarket,
  SpotTrade,
  DerivativeTrade,
  TradeDirection,
  PaginationOption,
  IndexerGrpcOracleApi,
  PriceLevel
} from '@injectivelabs/sdk-ts'
import { Network, getNetworkEndpoints } from '@injectivelabs/networks'

// Initialize with testnet
const NETWORK = Network.Testnet
const ENDPOINTS = getNetworkEndpoints(NETWORK)

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

  constructor() {
    this.spotApi = new IndexerGrpcSpotApi(ENDPOINTS.indexer)
    this.derivativesApi = new IndexerGrpcDerivativesApi(ENDPOINTS.indexer)
    this.oracleApi = new IndexerGrpcOracleApi(ENDPOINTS.indexer)
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

  async getSpotOrderbook(marketId: string): Promise<FormattedOrderbook> {
    try {
      const orderbook = await this.spotApi.fetchOrderbookV2(marketId) as any
      
      // Handle different possible response structures
      const bids = orderbook?.bids || orderbook?.buys || orderbook?.orderbook?.bids || []
      const asks = orderbook?.asks || orderbook?.sells || orderbook?.orderbook?.asks || []
      
      return {
        bids: Array.isArray(bids) ? bids : [],
        asks: Array.isArray(asks) ? asks : []
      }
    } catch (error) {
      console.error('Error fetching spot orderbook:', error)
      throw error
    }
  }

  async getDerivativesOrderbook(marketId: string): Promise<FormattedOrderbook> {
    try {
      const orderbook = await this.derivativesApi.fetchOrderbookV2(marketId) as any
      
      // Handle different possible response structures
      const bids = orderbook?.bids || orderbook?.buys || orderbook?.orderbook?.bids || []
      const asks = orderbook?.asks || orderbook?.sells || orderbook?.orderbook?.asks || []
      
      return {
        bids: Array.isArray(bids) ? bids : [],
        asks: Array.isArray(asks) ? asks : []
      }
    } catch (error) {
      console.error('Error fetching derivatives orderbook:', error)
      throw error
    }
  }

  async getSpotTrades(marketId: string): Promise<FormattedTrade[]> {
    try {
      const pagination: PaginationOption = {
        limit: 20
      }
      
      const response = await this.spotApi.fetchTrades({
        marketId,
        direction: TradeDirection.Sell,
        pagination
      })

      const trades = response.trades || []
      return trades.map((trade: SpotTrade) => ({
        id: trade.tradeId || '',
        price: trade.price || '0',
        quantity: trade.quantity || '0',
        timestamp: trade.executedAt || Date.now(),
        direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
        hash: trade.tradeId || ''
      }))
    } catch (error) {
      console.error('Error fetching spot trades:', error)
      throw error
    }
  }

  async getDerivativesTrades(marketId: string): Promise<FormattedTrade[]> {
    try {
      const pagination: PaginationOption = {
        limit: 20
      }
      
      const response = await this.derivativesApi.fetchTrades({
        marketId,
        direction: TradeDirection.Sell,
        pagination
      })

      const trades = response.trades || []
      return trades.map((trade: DerivativeTrade) => ({
        id: trade.tradeId || '',
        price: trade.executionPrice || '0',
        quantity: trade.executionQuantity || '0',
        timestamp: trade.executedAt || Date.now(),
        direction: trade.tradeDirection === 'buy' ? 'buy' : 'sell',
        hash: trade.tradeId || ''
      }))
    } catch (error) {
      console.error('Error fetching derivatives trades:', error)
      throw error
    }
  }

  async getOraclePrice(pair: string): Promise<string> {
    try {
      const oraclePrices = await this.oracleApi.fetchOraclePriceNoThrow({
        oracleType: 'bandibc' as any,
        baseSymbol: pair.split('/')[0] || '',
        quoteSymbol: pair.split('/')[1] || pair,
      })
      
      return oraclePrices?.price || '0'
    } catch (error) {
      console.error('Error fetching oracle price:', error)
      return '0'
    }
  }
}

export const injectiveClient = new InjectiveClient()