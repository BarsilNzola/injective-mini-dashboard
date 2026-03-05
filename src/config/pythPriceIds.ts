export interface PythPriceFeed {
  id: string;
  description: string;
  assetType: 'crypto' | 'equity' | 'forex' | 'commodity';
}

const HERMES_URL = 'https://hermes.pyth.network'

// Cache so we only fetch each feed ID once per session
const feedIdCache = new Map<string, string>()

// Looks up the correct Pyth feed ID from Hermes by searching the base symbol.
// This avoids hardcoding IDs that can be wrong or change.
export async function resolvePythFeedId(base: string): Promise<string | null> {
  const cacheKey = base.toUpperCase()
  if (feedIdCache.has(cacheKey)) return feedIdCache.get(cacheKey)!

  try {
    const response = await fetch(
      `${HERMES_URL}/v2/price_feeds?query=${encodeURIComponent(base)}&asset_type=crypto`,
      { headers: { accept: 'application/json' } }
    )

    if (!response.ok) return null

    const feeds: Array<{ id: string; attributes: { base: string; quote_currency: string } }> = await response.json()

    // Find the feed where base matches exactly and quote is USD
    const match = feeds.find(f =>
      f.attributes.base?.toUpperCase() === base.toUpperCase() &&
      f.attributes.quote_currency?.toUpperCase() === 'USD'
    )

    if (!match) {
      console.warn(`No Pyth feed found for ${base}/USD`)
      return null
    }

    // Hermes returns IDs without 0x prefix — add it
    const feedId = match.id.startsWith('0x') ? match.id : `0x${match.id}`
    feedIdCache.set(cacheKey, feedId)
    return feedId

  } catch (error) {
    console.error(`Failed to resolve Pyth feed ID for ${base}:`, error)
    return null
  }
}

// Kept for backward compatibility — synchronous helpers still work
// but feed ID resolution is now async via resolvePythFeedId
export function hasPythSupport(_pair: string): boolean {
  return true // All crypto bases are potentially supported
}

export function getSupportedPairs(): string[] {
  return Array.from(feedIdCache.keys())
}