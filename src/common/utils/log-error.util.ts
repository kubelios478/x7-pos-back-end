/** Message of a caught value for a log line (an Error's message, or the value itself). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Stack of a caught value, for Logger.error's second argument (undefined if not an Error). */
export function errorStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}
