import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import type { Pair, PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents, updatePairWithEvent } from '../../utils/pair'
import _ from 'lodash'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairUpdatePairEvent'
const EVENT_KEY = 'wasm-update-pair'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairUpdatePairEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  updatePairEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairsMap = await dbPairsFromEvents(updatePairEvents)

  const dbPairEvents: PairEvent[] = []

  let internalIdx = -1
  for (const updatePairEvent of updatePairEvents) {
    internalIdx += 1

    const { contractAddress } = updatePairEvent.expectUniqueKeys([
      'contractAddress',
    ])

    let pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    pair = updatePairWithEvent(pair, updatePairEvent, childLogger)

    dbPairEvents.push(
      updatePairEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )
  }

  await store.bulkCreate('PairEvent', dbPairEvents)

  const dbPairsToSave = _.filter(_.values(dbPairsMap), Boolean) as Pair[]
  await store.bulkUpdate('Pair', dbPairsToSave)
}
