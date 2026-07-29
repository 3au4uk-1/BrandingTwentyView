/**
 * Session overrides use `undefined` = inherit from saved view.
 * Any other value (including `null`, `''`, `[]`) is an intentional override.
 */
export const resolveSessionOverride = <T>(
  sessionValue: T | undefined,
  viewValue: T | undefined,
): T | undefined => (sessionValue !== undefined ? sessionValue : viewValue);
