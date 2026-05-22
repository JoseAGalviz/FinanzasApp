export function formatCurrency(amount, symbol = '$', decimals = 2) {
  const num = parseFloat(amount) || 0;
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const fixed = abs.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const result = decimals > 0 ? `${symbol}${formatted}.${dec}` : `${symbol}${formatted}`;
  return isNegative ? `-${result}` : result;
}

export function formatCurrencyCompact(amount, symbol = '$') {
  const num = Math.abs(parseFloat(amount) || 0);
  if (num >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${symbol}${(num / 1_000).toFixed(1)}K`;
  return formatCurrency(amount, symbol, 0);
}

export function parseAmount(str) {
  const cleaned = String(str).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

export function formatPercent(value, decimals = 1) {
  return `${(parseFloat(value) || 0).toFixed(decimals)}%`;
}
