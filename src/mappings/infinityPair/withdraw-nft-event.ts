import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { type Pair, type PairEvent } from '../../types'
import { MappingError } from '../../utils/errors'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import _ from 'lodash'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairWithdrawNftEvent'
const EVENT_KEY = 'wasm-withdraw-nft'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairWithdrawNftEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  withdrawNftEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbNftDeposits: string[] = []
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(withdrawNftEvents)

  let internalIdx = -1
  for (const withdrawNftEvent of withdrawNftEvents) {
    internalIdx += 1

    const { contractAddress, collection } = withdrawNftEvent.expectUniqueKeys([
      'contractAddress',
      'collection',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    if (collection !== pair.collection) {
      throw new MappingError(
        childLogger,
        `Collection mismatch: ${collection} != ${pair.collection}`,
      )
    }

    const tokenIds = withdrawNftEvent.expectMultiKey('tokenId')

    pair.totalNfts -= tokenIds.length

    dbNftDeposits.push(
      ..._.map(tokenIds, (tokenId) => `${collection}-${tokenId}`),
    )
    dbPairEvents.push(
      withdrawNftEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )
  }

  await store.bulkRemove('NftDeposit', dbNftDeposits)
  await store.bulkCreate('PairEvent', dbPairEvents)

  const dbPairsToSave = _.filter(_.values(dbPairsMap), Boolean) as Pair[]
  await store.bulkUpdate('Pair', dbPairsToSave)
}
