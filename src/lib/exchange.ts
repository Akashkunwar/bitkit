export type Currency = { code: string; name: string }

export const EXCHANGE_CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian rupee' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AED', name: 'UAE dirham' },
  { code: 'SAR', name: 'Saudi riyal' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'CNY', name: 'Chinese yuan' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'CHF', name: 'Swiss franc' },
]

export function convertAmount(amount: number, rate: number): number {
  if (!Number.isFinite(amount)) throw new Error('Enter an amount.')
  if (!(rate > 0) || !Number.isFinite(rate)) {
    throw new Error('Enter a rate above zero. BitKit does not fetch live rates.')
  }
  return amount * rate
}

export function inverseRate(rate: number): number {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new Error('Enter a rate above zero.')
  return 1 / rate
}
