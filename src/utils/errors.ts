import type { Logger, LoggerOptions, ChildLoggerOptions } from 'pino'

export type ChildLogger = Logger<LoggerOptions & ChildLoggerOptions>

export class MappingError extends Error {
  constructor(childLogger: ChildLogger, message: string) {
    super(message)
    this.name = 'MappingError'
    childLogger.error(message)
  }
}
