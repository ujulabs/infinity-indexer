import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import _ from 'lodash'
import { type Pair, type PairEvent } from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityPairWithdrawNftsEvent'
const EVENT_KEY = 'wasm-withdraw-nfts' // renamed to "withdraw-nfts" in v0.2.0

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairWithdrawNftsEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  withdrawNftsEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbNftDeposits: string[] = []
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(withdrawNftsEvents)

  let internalIdx = -1
  for (const withdrawNftsEvent of withdrawNftsEvents) {
    internalIdx += 1

    const { contractAddress, totalNfts } = withdrawNftsEvent.expectUniqueKeys([
      'contractAddress',
      'totalNfts',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    pair.totalNfts = parseInt(totalNfts, 10)

    const tokenIds = withdrawNftsEvent.expectMultiKey('tokenId')

    dbNftDeposits.push(
      ..._.map(tokenIds, (tokenId) => `${pair.collection}-${tokenId}`),
    )
    dbPairEvents.push(
      withdrawNftsEvent.toPairEvent(
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
