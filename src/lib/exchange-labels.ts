const EXCHANGE_LABELS: Record<string, string> = {
  // Binance
  TLkFYiRVAFKR79LqU1zPsTRDEB4qDKNsBz: "Binance",
  TV6MuMXfmLbBqPZvBHdwFsDnQeVfnmiuSi: "Binance",
  TDqSquXBgUCLYvYC4XZgrprLK589dkhSCf: "Binance",
  TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb: "Binance",
  TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe: "Binance",
  TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G: "Binance",
  TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS: "Binance",
  TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8wr: "Binance",
  TKrx5MHMkDPoNncrQYBbADp2gXkMxJnLJ2: "Binance",
  TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9: "Binance",
  TJCo98saj6WND61g1uuKbJ3Ek9ixmLGCnG: "Binance",
  TA6JNT1ezqdyxHGQDGa1hhzTgN2a6mEicp: "Binance",
  // OKX
  TFRx8RhUxPC24K5evn8FEBfkMb2PoJBHu7: "OKX",
  TRGCqsrdTT9QHjMh2GriFm8kxbCGRDnFnJ: "OKX",
  TAkMSVMaQj2DFpzgyNDRfMGqLhqGSxuNVf: "OKX",
  // Huobi / HTX
  THPvaUhoh2Qn2y9THCZML3H4ABSMzPa2y8: "HTX",
  TDGMoJn2pKMJpwDVLAjX9bWfaTk5QRUkdC: "HTX",
  TNaRAoLUyYEV2uF7GUrzSjRQTU8v5ZJ5VR: "HTX",
  TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ: "HTX",
  TWkM5JShDMRXTEvmt69MVkqYDBPfJ2BkJh: "HTX",
  // Bybit
  TRjDxCZpqfHMB6fTBp8rTPPcj9LdqhkPs7: "Bybit",
  TLM9JFMzMas1LWYR5vrrxm4AvUqBp9UeGE: "Bybit",
  // KuCoin
  TUpHuBFSv7bCL3mgXNjFb4gEtEjSmkVhEL: "KuCoin",
  // Gate.io
  TDvmhmGwdpLHjGPmLvKNfJFijFKMfrawxR: "Gate.io",
  // Poloniex
  TGzz8gjYiYRqpfmDwnLxfCAQnhYrMhBJNH: "Poloniex",
  TBYsLWR54TjqinWDDWMUTjQFYE1hnJQ33V: "Poloniex",
  // Bitfinex
  TQrBnh6ZkEJFVT7CkhPHpnNzMYo7HTAS1a: "Bitfinex",
  // MEXC
  TW1kBv3AEbY6cUJHMPnEsGPcun2MVr2KZC: "MEXC",
  // Bitget
  TAF7asMYjAPeGq8j7arNLsttdWA2DJ2URC: "Bitget",
  // Crypto.com
  TSR1eBuv2tubpRQQ1PStGo28HxQN8T7iR5: "Crypto.com",
  // Sun.io / JustLend / JustSwap
  TKcEU8ekq2ZoFzLSGFYCUY6aocJBX9X31b: "Sun.io",
  TX7kybeP6UwTBRHLNPYmswFESHfyjm9bAS: "JustLend",
  TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd: "JustSwap",
  // Kraken
  TJLFxL6M5AXVkS3BRummrGZfhBi5dUGFpq: "Kraken",
  // Bittrex
  TYTDhiBE4eEXfNChSi6dE6K5GbrHFWoymq: "Bittrex",
};

export function getExchangeLabel(address: string): string | undefined {
  return EXCHANGE_LABELS[address];
}

export function isExchangeAddress(address: string): boolean {
  return address in EXCHANGE_LABELS;
}
