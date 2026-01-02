/**
 * Namespace delimiter - colon character
 * Used to separate namespace from key in translation lookups.
 * This is the user-facing format (matching locale files and CLI extraction output).
 * Note: The API uses \u001F internally, but SDK uses : for client-side keys.
 */
export const NS_DELIMITER = ':';
