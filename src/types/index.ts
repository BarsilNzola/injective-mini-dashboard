// Market types
export interface Market {
  id: string;
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  type: 'spot' | 'derivatives';
  minPriceTickSize: string;
  minQuantityTickSize: string;
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