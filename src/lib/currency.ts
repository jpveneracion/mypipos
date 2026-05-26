/**
 * Currency utilities for Pi Network
 */

/**
 * Get the appropriate currency symbol based on environment
 * - Production (main branch): π
 * - Development (dev branch): Test-π
 */
export function getCurrencySymbol(): string {
  // Check if we're in development environment
  if (process.env.NODE_ENV === 'development') {
    return 'Test-π';
  }

  // For production, use standard Pi symbol
  return 'π';
}

/**
 * Format price with Pi currency symbol at the end
 */
export function formatPrice(amount: number): string {
  const symbol = getCurrencySymbol();
  return `${amount.toFixed(7)} ${symbol}`;
}

/**
 * Format price with currency symbol at the beginning (alternative format)
 */
export function formatPricePrefix(amount: number): string {
  const symbol = getCurrencySymbol();
  return `${symbol}${amount.toFixed(7)}`;
}
