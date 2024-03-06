import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import semver from 'semver'
import {
  type Pair,
  Swap,
  SwapType,
  type PairEvent,
  SwapItem,
} from '../../types'
import type { SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents } from '../../utils/pair'
import { dbContractsFromEvents } from '../../utils/contracts'
import _ from 'lodash'
import { buildSwapId } from '../../utils/swaps'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'
import { MappingError } from '../../utils/errors'

const HANDLER_KEY = 'infinityPairSwapTokensForNftEvent'
const EVENT_KEY = 'wasm-swap-tokens-for-nft'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairSwapTokensForNftEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  swapTokensForNftEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const dbPairsMap = await dbPairsFromEvents(swapTokensForNftEvents)
  const contractMap = await dbContractsFromEvents(swapTokensForNftEvents)

  const dbNftDeposits: string[] = []
  const dbPairEvents: PairEvent[] = []
  const dbSwapMap: Record<string, Swap> = {}
  const dbSwapItems: SwapItem[] = []

  let internalIdx = -1
  for (const swapTokensForNftEvent of swapTokensForNftEvents) {
    internalIdx += 1

    const { contractAddress } = swapTokensForNftEvent.expectUniqueKeys([
      'contractAddress',
    ])

    const pair = dbPairsMap[contractAddress]
    if (!pair) {
      childLogger.warn(`Pair not found for address ${contractAddress}`)
      continue
    }

    const contract = contractMap[contractAddress]
    if (!contract) {
      childLogger.warn(`Contract not found for contract ${contractAddress}`)
      continue
    }

    const type: SwapType = SwapType.TokensForNft

    let tokenId: string
    let senderRecipient: string | undefined
    let fairBurnFee: bigint
    let royaltyFee: bigint
    let swapFee: bigint
    let sellerAmount: bigint
    let totalAmount: bigint

    if (semver.lte(contract.version, '0.1.1')) {
      const {
        tokenId: eventTokenId,
        fairBurn: eventFairBurnFee,
        royalty: eventRoyaltyFee,
        swap: eventSwapFee,
        seller: eventSellerAmount,
        total: eventTotalPrice,
      } = swapTokensForNftEvent.expectUniqueKeys([
        'tokenId',
        'fairBurn',
        'royalty',
        'swap',
        'seller',
        'total',
      ])

      tokenId = eventTokenId
      fairBurnFee = BigInt(eventFairBurnFee)
      sellerAmount = BigInt(eventSellerAmount)
      royaltyFee = BigInt(eventRoyaltyFee)
      swapFee = BigInt(eventSwapFee)
      totalAmount = BigInt(eventTotalPrice)
    } else if (semver.lt(contract.version, '0.2.0')) {
      const {
        tokenId: eventTokenId,
        collection,
        senderRecipient: eventSenderRecipient,
        fairBurnFee: eventFairBurnFee,
        royaltyFee: eventRoyaltyFee,
        swapFee: eventSwapFee,
        sellerAmount: eventSellerAmount,
        totalPrice: eventTotalPrice,
      } = swapTokensForNftEvent.expectUniqueKeys([
        'tokenId',
        'collection',
        'pairOwner',
        'senderRecipient',
        'fairBurnFee',
        'royaltyFee',
        'swapFee',
        'sellerAmount',
        'totalPrice',
      ])

      if (collection !== pair.collection) {
        throw new MappingError(
          childLogger,
          `Collection mismatch: ${collection} != ${collection}`,
        )
      }

      tokenId = eventTokenId
      senderRecipient = eventSenderRecipient
      fairBurnFee = BigInt(eventFairBurnFee)
      sellerAmount = BigInt(eventSellerAmount)
      royaltyFee = BigInt(eventRoyaltyFee)
      swapFee = BigInt(eventSwapFee)
      totalAmount = BigInt(eventTotalPrice)
    } else {
      const {
        tokenId: eventTokenId,
        senderRecipient: eventSenderRecipient,
        fairBurnFee: eventFairBurnFee,
        sellerAmount: eventSellerAmount,
      } = swapTokensForNftEvent.expectUniqueKeys([
        'tokenId',
        'senderRecipient',
        'fairBurnFee',
        'sellerAmount',
      ])

      tokenId = eventTokenId
      senderRecipient = eventSenderRecipient
      fairBurnFee = BigInt(eventFairBurnFee)
      sellerAmount = BigInt(eventSellerAmount)
      royaltyFee = BigInt(swapTokensForNftEvent.getUniqueKey('royaltyFee') || 0)
      swapFee = BigInt(swapTokensForNftEvent.getUniqueKey('swapFee') || 0)
      totalAmount = fairBurnFee + sellerAmount + royaltyFee + swapFee

      const eventSpotPrice = swapTokensForNftEvent.getUniqueKey('spotPrice')
      if (eventSpotPrice) {
        pair.spotPrice = BigInt(eventSpotPrice)
      }
    }

    pair.totalNfts -= 1

    dbNftDeposits.push(`${pair.collection}-${tokenId}`)
    dbPairEvents.push(
      swapTokensForNftEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )

    let swapId: string | undefined
    if (cosmosEvent.tx) {
      swapId = buildSwapId(cosmosEvent.tx.hash, pair.collection, type)
      dbSwapMap[swapId] = Swap.create({
        id: swapId,
        txHash: cosmosEvent.tx.hash,
        collection: pair.collection,
        type,
        created: timestamp,
        senderRecipient,
      })
    }

    dbSwapItems.push(
      SwapItem.create({
        id: swapTokensForNftEvent.getEventId(
          blockHeight,
          cosmosEvent.idx,
          internalIdx,
        ),
        blockHeight,
        eventIdx: cosmosEvent.idx,
        internalIdx,
        tokenId,
        fairBurnFee,
        royaltyFee,
        swapFee,
        sellerAmount,
        totalAmount,
        pairId: pair.id,
        swapId,
      }),
    )
  }

  await store.bulkRemove('NftDeposit', dbNftDeposits)
  await store.bulkCreate('PairEvent', dbPairEvents)

  await store.bulkCreate('Swap', _.values(dbSwapMap))
  await store.bulkCreate('SwapItem', dbSwapItems)

  const dbPairsToSave = _.filter(_.values(dbPairsMap), Boolean) as Pair[]
  await store.bulkUpdate('Pair', dbPairsToSave)
}
