// Market types
export interface Market {
  id: string;
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  type: 'spot' | 'derivatives';
  minPriceTickSize: number;
  minQuantityTickSize: number;
  marketStatus: string;
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