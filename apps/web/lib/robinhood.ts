// Single source of truth for Robinhood Chain constants in the frontend.
// Mirror of contracts/src/Constants.sol. Every value is VERIFY-tagged until confirmed against
// official Robinhood Chain docs and the block explorer. No other file may hold an address literal.

// VERIFY: chain ID from official docs / chainlist.
export const ROBINHOOD_CHAIN_ID = 4663 as const;

// VERIFY: canonical ERC-6551 registry; confirm deployed on 4663.
export const ERC6551_REGISTRY = "0x000000006551c19487814612e58FE06813775758" as const;

// VERIFY: ERC-6551 account implementation (Tokenbound AccountV3); confirm deployed on 4663.
export const ERC6551_ACCOUNT_IMPL = "0x41C8f39463A868d3A88af00cd0fe7102F30E44eC" as const;

// VERIFY: RPC + explorer URLs from official docs. Read from env so nothing is hardcoded.
export const ROBINHOOD_RPC_URL = process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? "";
export const ROBINHOOD_EXPLORER_URL = process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL ?? "";

// VERIFY: tokenised-stock reward tokens on 4663 — fill from official docs.
export const STOCK_TOKENS: readonly `0x${string}`[] = [];
