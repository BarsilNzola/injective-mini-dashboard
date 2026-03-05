// Market types
export interface Market {
  id: string;
  ticker: string;
  // Normalized symbols for oracle lookups (e.g. "INJ", "USDT")
  baseSymbol: string;
  quoteSymbol: string;
  baseDenom: string;
  quoteDenom: string;
  marketType: 'spot' | 'derivative';  // ← renamed from 'type', values updated
  minPriceTickSize: string;            // ← changed from number to string (API returns strings)
  minQuantityTickSize: string;         // ← same
  baseDecimals: number;
  quoteDecimals: number;
}

// Orderbook types
export interface OrderbookEntry {
  price: string;
  quantity: string;
  timestamp: number;
}

export interface Orderbook {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
}

// Trade types
export interface Trade {
  id: string;
  price: string;
  quantity: string;
  timestamp: number;
  direction: 'buy' | 'sell';
  hash: string;
}

// Price types
export interface PriceData {
  price: string;
  change24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
}