import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { type Pair, type PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents, updatePairWithEvent } from '../../utils/pair'
import _ from 'lodash'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairMigratePairEvent'
const EVENT_KEY = 'wasm-migrate-pair'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairMigratePairEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  migratePairEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairsMap = await dbPairsFromEvents(migratePairEvents)

  const dbPairEvents: PairEvent[] = []

  let internalIdx = -1
  for (const migratePairEvent of migratePairEvents) {
    internalIdx += 1

    const { contractAddress } = migratePairEvent.expectUniqueKeys([
      'contractAddress',
    ])

    let pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    pair = updatePairWithEvent(pair, migratePairEvent, childLogger)

    dbPairEvents.push(
      migratePairEvent.toPairEvent(
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
