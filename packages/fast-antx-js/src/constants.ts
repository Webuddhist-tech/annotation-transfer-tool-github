/** First tofu code point. Python `tofu_lower_limit = 200000` (U+30D40). */
export const TOFU_LOWER = 0x30d40;

/** Inclusive end of the filter scan. Python `tofu_upper_limit = 1112064` (U+10F800). */
export const TOFU_UPPER = 0x10f800;

/** HFML local-id class lower bound. Python `chr(200000)`. */
export const HFML_LOCAL_ID_LOWER = 0x30d40;

/** HFML local-id class upper bound. Python `chr(1000049)` (U+F4271). */
export const HFML_LOCAL_ID_UPPER = 0xf4271;

/**
 * node-dmp-cli v0.0.3 sets this to 0.
 * Zero disables the deadline and disables diff_halfMatch.
 */
export const DIFF_TIMEOUT = 0;
