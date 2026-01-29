// BattleChain contract time constants (matching AttackRegistry.sol)
// All values in milliseconds for API responses

/** 14 days - Auto-promotion deadline if DAO doesn't act */
export const PROMOTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** 3 days - Delay after owner requests promotion */
export const PROMOTION_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

/** 7 days - Minimum Safe Harbor commitment window */
export const MIN_COMMITMENT_MS = 7 * 24 * 60 * 60 * 1000;
