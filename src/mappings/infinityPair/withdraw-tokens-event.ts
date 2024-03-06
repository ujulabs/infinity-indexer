import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { type PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairWithdrawTokensEvent'
const EVENT_KEY = 'wasm-withdraw-tokens'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairWithdrawTokensEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  withdrawTokensEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(withdrawTokensEvents)

  let internalIdx = -1
  for (const withdrawTokensEvent of withdrawTokensEvents) {
    internalIdx += 1

    const { contractAddress } = withdrawTokensEvent.expectUniqueKeys([
      'contractAddress',
      'funds',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    dbPairEvents.push(
      withdrawTokensEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )
  }

  await store.bulkCreate('PairEvent', dbPairEvents)
}
