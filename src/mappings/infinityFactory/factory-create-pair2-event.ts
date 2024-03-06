import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { eventHandler } from '../../utils/handler'
import { handlerFn } from './factory-create-pair-event'

const HANDLER_KEY = 'infinityFactoryCreatePair2Event'
const EVENT_KEY = 'wasm-factory-create-pair2'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityFactoryCreatePair2Event = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)
