/** Raised by parsers on unreadable input; validate() converts it into an FV-01 blocker (never throws). */
export class FileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileParseError';
  }
}
