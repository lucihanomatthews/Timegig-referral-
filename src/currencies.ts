export interface CountryCurrency {
  code: string;
  country: string;
  flag: string;
  currencyCode: string;
  symbol: string;
  rateFromUsd: number;
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  { code: 'US', country: 'United States', flag: '🇺🇸', currencyCode: 'USD', symbol: '$', rateFromUsd: 1 },
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧', currencyCode: 'GBP', symbol: '£', rateFromUsd: 0.79 },
  { code: 'ZA', country: 'South Africa', flag: '🇿🇦', currencyCode: 'ZAR', symbol: 'R', rateFromUsd: 18.2 },
  { code: 'EU', country: 'European Union (Euro)', flag: '🇪🇺', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'CA', country: 'Canada', flag: '🇨🇦', currencyCode: 'CAD', symbol: 'CA$', rateFromUsd: 1.39 },
  { code: 'AU', country: 'Australia', flag: '🇦🇺', currencyCode: 'AUD', symbol: 'A$', rateFromUsd: 1.52 },
  { code: 'NG', country: 'Nigeria', flag: '🇳🇬', currencyCode: 'NGN', symbol: '₦', rateFromUsd: 1620 },
  { code: 'KE', country: 'Kenya', flag: '🇰🇪', currencyCode: 'KES', symbol: 'KSh ', rateFromUsd: 129 },
  { code: 'GH', country: 'Ghana', flag: '🇬🇭', currencyCode: 'GHS', symbol: '₵', rateFromUsd: 15.8 },
  { code: 'IN', country: 'India', flag: '🇮🇳', currencyCode: 'INR', symbol: '₹', rateFromUsd: 84.5 },
  { code: 'AE', country: 'United Arab Emirates', flag: '🇦🇪', currencyCode: 'AED', symbol: 'AED ', rateFromUsd: 3.67 },
  { code: 'SA', country: 'Saudi Arabia', flag: '🇸🇦', currencyCode: 'SAR', symbol: 'SAR ', rateFromUsd: 3.75 },
  { code: 'DE', country: 'Germany', flag: '🇩🇪', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'FR', country: 'France', flag: '🇫🇷', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'ES', country: 'Spain', flag: '🇪🇸', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'IT', country: 'Italy', flag: '🇮🇹', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'NL', country: 'Netherlands', flag: '🇳🇱', currencyCode: 'EUR', symbol: '€', rateFromUsd: 0.92 },
  { code: 'JP', country: 'Japan', flag: '🇯🇵', currencyCode: 'JPY', symbol: '¥', rateFromUsd: 154 },
  { code: 'CN', country: 'China', flag: '🇨🇳', currencyCode: 'CNY', symbol: '¥', rateFromUsd: 7.24 },
  { code: 'KR', country: 'South Korea', flag: '🇰🇷', currencyCode: 'KRW', symbol: '₩', rateFromUsd: 1395 },
  { code: 'SG', country: 'Singapore', flag: '🇸🇬', currencyCode: 'SGD', symbol: 'S$', rateFromUsd: 1.34 },
  { code: 'CH', country: 'Switzerland', flag: '🇨🇭', currencyCode: 'CHF', symbol: 'CHF ', rateFromUsd: 0.88 },
  { code: 'NZ', country: 'New Zealand', flag: '🇳🇿', currencyCode: 'NZD', symbol: 'NZ$', rateFromUsd: 1.68 },
  { code: 'BR', country: 'Brazil', flag: '🇧🇷', currencyCode: 'BRL', symbol: 'R$', rateFromUsd: 5.8 },
  { code: 'MX', country: 'Mexico', flag: '🇲🇽', currencyCode: 'MXN', symbol: 'MX$', rateFromUsd: 20.2 },
  { code: 'PH', country: 'Philippines', flag: '🇵🇭', currencyCode: 'PHP', symbol: '₱', rateFromUsd: 58.5 },
  { code: 'ID', country: 'Indonesia', flag: '🇮🇩', currencyCode: 'IDR', symbol: 'Rp', rateFromUsd: 15850 },
  { code: 'MY', country: 'Malaysia', flag: '🇲🇾', currencyCode: 'MYR', symbol: 'RM ', rateFromUsd: 4.47 },
  { code: 'TH', country: 'Thailand', flag: '🇹🇭', currencyCode: 'THB', symbol: '฿', rateFromUsd: 34.6 },
  { code: 'TR', country: 'Turkey', flag: '🇹🇷', currencyCode: 'TRY', symbol: '₺', rateFromUsd: 34.4 },
  { code: 'PL', country: 'Poland', flag: '🇵🇱', currencyCode: 'PLN', symbol: 'zł', rateFromUsd: 4.08 },
  { code: 'SE', country: 'Sweden', flag: '🇸🇪', currencyCode: 'SEK', symbol: 'kr ', rateFromUsd: 10.9 },
  { code: 'NO', country: 'Norway', flag: '🇳🇴', currencyCode: 'NOK', symbol: 'kr ', rateFromUsd: 11.0 },
  { code: 'EG', country: 'Egypt', flag: '🇪🇬', currencyCode: 'EGP', symbol: 'E£', rateFromUsd: 49.2 },
  { code: 'MA', country: 'Morocco', flag: '🇲🇦', currencyCode: 'MAD', symbol: 'MAD ', rateFromUsd: 9.9 },
  { code: 'PK', country: 'Pakistan', flag: '🇵🇰', currencyCode: 'PKR', symbol: '₨', rateFromUsd: 278 },
  { code: 'BD', country: 'Bangladesh', flag: '🇧🇩', currencyCode: 'BDT', symbol: '৳', rateFromUsd: 119 },
  { code: 'AR', country: 'Argentina', flag: '🇦🇷', currencyCode: 'ARS', symbol: 'ARS$', rateFromUsd: 995 },
  { code: 'CO', country: 'Colombia', flag: '🇨🇴', currencyCode: 'COP', symbol: 'COL$', rateFromUsd: 4400 },
  { code: 'ZW', country: 'Zimbabwe', flag: '🇿🇼', currencyCode: 'USD', symbol: '$', rateFromUsd: 1 },
  { code: 'BW', country: 'Botswana', flag: '🇧🇼', currencyCode: 'BWP', symbol: 'P', rateFromUsd: 13.5 },
  { code: 'NA', country: 'Namibia', flag: '🇳🇦', currencyCode: 'NAD', symbol: 'N$', rateFromUsd: 18.2 }
];

const COMMA_DECIMAL_COUNTRIES = new Set(['ZA', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL', 'SE', 'NO', 'BR', 'AR', 'CO', 'ID', 'TR', 'EU']);

export function formatCurrency(
  usdAmount: number,
  country: CountryCurrency,
  forceDecimals?: number
): string {
  const converted = usdAmount * country.rateFromUsd;
  const decimals = forceDecimals !== undefined ? forceDecimals : 2;
  const useCommaDecimal = COMMA_DECIMAL_COUNTRIES.has(country.code);

  const formatted = converted.toLocaleString(useCommaDecimal ? 'de-DE' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${country.symbol}${formatted}`;
}

export function parseUsdFromString(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
