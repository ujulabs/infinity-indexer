import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { type PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairDepositTokensEvent'
const EVENT_KEY = 'wasm-deposit-tokens' // event did not exist before v0.2.0

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairDepositTokensEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  depositTokensEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairEvents: PairEvent[] = []
  const dbPairsMap = await dbPairsFromEvents(depositTokensEvents)

  let internalIdx = -1
  for (const depositTokensEvent of depositTokensEvents) {
    internalIdx += 1

    const { contractAddress } = depositTokensEvent.expectUniqueKeys([
      'contractAddress',
      'funds',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    dbPairEvents.push(
      depositTokensEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )
  }

  await store.bulkCreate('PairEvent', dbPairEvents)
}
