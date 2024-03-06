import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import _ from 'lodash'
import { NftDeposit, type Pair, type PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairDepositNftsEvent'
const EVENT_KEY = 'wasm-deposit-nfts' // renamed to "deposit-nfts" in v0.2.0

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairDepositNftsEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  depositNftsEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbNftDeposits: NftDeposit[] = []
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(depositNftsEvents)

  let internalIdx = -1
  for (const depositNftEvent of depositNftsEvents) {
    internalIdx += 1

    const { contractAddress, totalNfts } = depositNftEvent.expectUniqueKeys([
      'contractAddress',
      'totalNfts',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    pair.totalNfts = parseInt(totalNfts, 10)

    const tokenIds = depositNftEvent.expectMultiKey('tokenId')

    dbNftDeposits.push(
      ..._.map(tokenIds, (tokenId) =>
        NftDeposit.create({
          id: `${pair.collection}-${tokenId}`,
          collection: pair.collection,
          tokenId,
          pairId: pair.id,
        }),
      ),
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
