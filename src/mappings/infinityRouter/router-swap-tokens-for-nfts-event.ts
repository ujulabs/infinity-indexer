import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import { RouterSwap, SwapType } from '../../types'
import { latestContractByName } from '../../utils/contracts'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { MappingError } from '../../utils/errors'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'

const HANDLER_KEY = 'infinityRouterSwapTokensForNftsEvent'
const EVENT_KEY = 'wasm-router-swap-tokens-for-nfts'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityRouterSwapTokensForNftsEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  routerSwapNftsForTokensEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const routerContract = await latestContractByName('infinity-router')
  if (!routerContract) {
    throw new MappingError(childLogger, 'infinity-router contract not found')
  }

  const dbRouterSwaps: RouterSwap[] = []

  let internalIdx = -1
  for (const routerSwapNftsForTokensEvent of routerSwapNftsForTokensEvents) {
    internalIdx += 1
    const {
      contractAddress,
      collection,
      denom,
      senderRecipient,
      numSwaps: eventNumSwaps,
      volume: eventVolume,
    } = routerSwapNftsForTokensEvent.expectUniqueKeys([
      'contractAddress',
      'collection',
      'denom',
      'senderRecipient',
      'numSwaps',
      'volume',
    ])

    if (contractAddress !== routerContract.address) {
      childLogger.warn(
        `Expected contract address ${routerContract.address} but got ${contractAddress}`,
      )
      continue
    }

    const numSwaps = parseInt(eventNumSwaps, 10)
    const volume = BigInt(eventVolume)

    dbRouterSwaps.push(
      RouterSwap.create({
        id: routerSwapNftsForTokensEvent.getEventId(
          blockHeight,
          cosmosEvent.idx,
          internalIdx,
        ),
        blockHeight,
        eventIdx: cosmosEvent.idx,
        internalIdx,
        created: timestamp,
        type: SwapType.NftForTokens,
        collection,
        denom,
        senderRecipient,
        numSwaps,
        volume,
      }),
    )
  }

  await store.bulkCreate('RouterSwap', dbRouterSwaps)
}
