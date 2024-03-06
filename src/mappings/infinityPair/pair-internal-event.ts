import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import _ from 'lodash'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { type Pair } from '../../types'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairPairInternalEvent'
const EVENT_KEY = 'wasm-pair-internal'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairPairInternalEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  pairInternalEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairsMap = await dbPairsFromEvents(pairInternalEvents)

  for (const pairInternalEvent of pairInternalEvents) {
    const { contractAddress, totalTokens: rawTotalTokens } =
      pairInternalEvent.expectUniqueKeys(['contractAddress', 'totalTokens'])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    pair.totalTokens = BigInt(rawTotalTokens)

    const sellToPairQuote = pairInternalEvent.getUniqueKey('sellToPairQuote')
    if (sellToPairQuote) {
      pair.sellToPairQuote = BigInt(sellToPairQuote)
    } else {
      pair.sellToPairQuote = undefined
    }
    const buyFromPairQuote = pairInternalEvent.getUniqueKey('buyFromPairQuote')
    if (buyFromPairQuote) {
      pair.buyFromPairQuote = BigInt(buyFromPairQuote)
    } else {
      pair.buyFromPairQuote = undefined
    }
  }

  const dbPairsToSave = _.filter(_.values(dbPairsMap), Boolean) as Pair[]
  await store.bulkUpdate('Pair', dbPairsToSave)
}
