import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { NftDeposit, type Pair, type PairEvent } from '../../types'
import { MappingError } from '../../utils/errors'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import _ from 'lodash'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'
import { blockTimeToDate } from '../../utils/date'

const HANDLER_KEY = 'infinityPairDepositNftEvent'
const EVENT_KEY = 'wasm-deposit-nft'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairDepositNftEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  depositNftEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbNftDeposits: NftDeposit[] = []
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(depositNftEvents)

  let internalIdx = -1
  for (const depositNftEvent of depositNftEvents) {
    internalIdx += 1

    const { contractAddress, collection, tokenId } =
      depositNftEvent.expectUniqueKeys([
        'contractAddress',
        'collection',
        'tokenId',
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

    pair.totalNfts += 1

    dbNftDeposits.push(
      NftDeposit.create({
        id: `${collection}-${tokenId}`,
        collection,
        tokenId,
        pairId: pair.id,
      }),
    )
    dbPairEvents.push(
      depositNftEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )
  }

  await store.bulkCreate('NftDeposit', dbNftDeposits)
  await store.bulkCreate('PairEvent', dbPairEvents)

  const dbPairsToSave = _.filter(_.values(dbPairsMap), Boolean) as Pair[]
  await store.bulkUpdate('Pair', dbPairsToSave)
}
