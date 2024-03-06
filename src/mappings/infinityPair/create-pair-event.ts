import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import semver from 'semver'
import { BondingCurve, Pair, PairType, type PairEvent } from '../../types'
import {
  createdContractsFromEvents,
  expectContract,
} from '../../utils/contracts'
import { sanitizeEvents, type SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { dbPairsFromEvents, updatePairWithEvent } from '../../utils/pair'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'
import assert from 'assert'

const HANDLER_KEY = 'infinityPairCreatePairEvent'
const EVENT_KEY = 'wasm-create-pair'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityPairCreatePairEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  createPairEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const factoryContract = await expectContract('infinity-factory')
  const isV0_2 = semver.gte(factoryContract.version, '0.2.0')

  const dbPairs: Pair[] = []
  const dbPairEvents: PairEvent[] = []

  const dbPairsMap = await dbPairsFromEvents(createPairEvents)

  let internalIdx = -1
  for (const createPairEvent of createPairEvents) {
    internalIdx += 1

    dbPairEvents.push(
      createPairEvent.toPairEvent(
        blockHeight,
        cosmosEvent.idx,
        internalIdx,
        timestamp,
      ),
    )

    if (!isV0_2) {
      const { contractAddress, collection, denom, owner } =
        createPairEvent.expectUniqueKeys([
          'contractAddress',
          'collection',
          'denom',
          'owner',
        ])

      let pair = dbPairsMap[contractAddress]

      if (pair) {
        childLogger.warn(`Pair already exists: ${contractAddress}`)
        continue
      }

      pair = Pair.create({
        id: contractAddress,
        blockHeight,
        created: timestamp,
        collection,
        owner,
        denom,
        pairType: PairType.Token,
        bondingCurve: BondingCurve.Linear,
        isActive: false,
        totalTokens: BigInt(0),
        totalNfts: 0,
      })
      pair = updatePairWithEvent(pair, createPairEvent, childLogger)
      dbPairs.push(pair)
    }
  }

  await store.bulkCreate('PairEvent', dbPairEvents)

  if (!isV0_2) {
    assert(
      cosmosEvent.log,
      'Expected log in cosmosEvent, end blocker not supported',
    )

    await store.bulkCreate('Pair', dbPairs)

    const dbContracts = createdContractsFromEvents(
      blockHeight,
      timestamp,
      sanitizeEvents(cosmosEvent.log.events),
    )
    await store.bulkCreate('Contract', dbContracts)
  }
}
