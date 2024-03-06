import type { CosmosEvent, CosmosMessage } from '@subql/types-cosmos'
import _ from 'lodash'
import type { ChildLoggerOptions, Logger, LoggerOptions } from 'pino'
import { sanitizeEvents, type SanitizedEvent } from './events'
import { type ModifiedCosmosEvent } from './modified-types'
import { blockTimeToDate } from './date'

export type ChildLogger = Logger<LoggerOptions & ChildLoggerOptions>

export const msgHandler = (
  handlerKey: string,
  handlerFn: (
    cosmosMessage: CosmosMessage,
    logger: ChildLogger,
  ) => Promise<void>,
): ((cosmosMessage: CosmosMessage) => Promise<void>) => {
  return async (cosmosMessage: CosmosMessage): Promise<void> => {
    const childLogger = logger.child({
      cosmosTxHash: cosmosMessage.tx.hash,
      height: cosmosMessage.block.header.height,
    })
    childLogger.debug(`messageHandlerKey: ${handlerKey}`)

    await handlerFn(cosmosMessage, childLogger)
  }
}

export const eventHandler = (
  handlerKey: string,
  eventType: string,
  handlerFn: (
    blockHeight: number,
    timestamp: Date,
    sanitizedEvents: SanitizedEvent[],
    cosmosEvent: ModifiedCosmosEvent,
    logger: ChildLogger,
  ) => Promise<void>,
): ((cosmosEvent: ModifiedCosmosEvent) => Promise<void>) => {
  return async (cosmosEvent: ModifiedCosmosEvent): Promise<void> => {
    const blockHeight = cosmosEvent.block.header.height
    const timestamp = blockTimeToDate(cosmosEvent.block.block.header.time)

    const childLogger = logger.child({
      blockHeight,
    })
    childLogger.debug(
      `blockHeight: ${blockHeight} eventHandlerKey: ${handlerKey}, eventType: ${eventType}`,
    )

    const santizedEvents = _.filter(
      sanitizeEvents([cosmosEvent.event]),
      (event) => event.type === eventType,
    )

    await handlerFn(
      blockHeight,
      timestamp,
      santizedEvents,
      cosmosEvent,
      childLogger,
    )
  }
}
