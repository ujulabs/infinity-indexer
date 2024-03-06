import { CosmosHandlerKind, type CosmosEventHandler } from '@subql/types-cosmos'
import _ from 'lodash'
import semver from 'semver'
import { BondingCurve, Pair, PairType, type PairEvent } from '../../types'
import {
  createdContractsFromEvents,
  expectContract,
} from '../../utils/contracts'
import { sanitizeEvents, type SanitizedEvent } from '../../utils/events'
import type { ChildLogger } from '../../utils/handler'
import { eventHandler } from '../../utils/handler'
import { type ModifiedCosmosEvent } from '../../utils/modified-types'
import { updatePairWithEvent } from '../../utils/pair'
import assert from 'assert'

const HANDLER_KEY = 'infinityFactoryCreatePairEvent'
const EVENT_KEY = 'wasm-factory-create-pair'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityFactoryCreatePairEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

export async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  factoryCreatePairEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const factoryContract = await expectContract('infinity-factory')
  if (semver.lt(factoryContract.version, '0.2.0')) {
    childLogger.debug(
      `Contract ${factoryContract.name} is below version 0.2.0, skipping`,
    )
    return
  }

  const wrongContract = _.some(factoryCreatePairEvents, (event) => {
    const { contractAddress } = event.expectUniqueKeys(['contractAddress'])
    return contractAddress !== factoryContract.address
  })
  if (wrongContract) {
    childLogger.warn(
      `Event ${EVENT_KEY} has wrong contract address, expected ${factoryContract.address}`,
    )
    return
  }

  assert(
    cosmosEvent.log,
    'Expected log in cosmosEvent, migrations in end blocker not supported',
  )

  const dbPairs: Pair[] = []

  const sanitizedEvents = sanitizeEvents(cosmosEvent.log.events)
  const createPairEvents = _.filter(
    sanitizedEvents,
    (event) => event.type === 'wasm-create-pair',
  )

  for (const createPairEvent of createPairEvents) {
    const { contractAddress, collection, denom, owner } =
      createPairEvent.expectUniqueKeys([
        'contractAddress',
        'collection',
        'denom',
        'owner',
      ])

    // eslint-disable-next-line no-await-in-loop
    let pair = await Pair.get(contractAddress)
    if (pair) {
      childLogger.warn(`Pair already exists: ${contractAddress}`)
      return
    }

    // Create a shell default pair, then update it
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

  await store.bulkCreate('Pair', dbPairs)

  const dbContracts = createdContractsFromEvents(
    blockHeight,
    timestamp,
    sanitizedEvents,
  )
  await store.bulkCreate('Contract', dbContracts)
}
