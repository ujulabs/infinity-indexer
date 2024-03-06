import type { CosmosEventHandler } from '@subql/types-cosmos'
import { CosmosHandlerKind } from '@subql/types-cosmos'
import { type SanitizedEvent, sanitizeEvents } from '../utils/events'
import { eventHandler, type ChildLogger } from '../utils/handler'
import assert from 'assert'
import _ from 'lodash'
import { dbContractsFromEvents } from '../utils/contracts'
import { Contract } from '../types'
import { type ModifiedCosmosEvent } from '../utils/modified-types'

const HANDLER_KEY = 'infinityContractMigrateEvent'
const EVENT_KEY = 'wasm-migrate'

export const handler: CosmosEventHandler = {
  kind: CosmosHandlerKind.Event,
  handler: HANDLER_KEY,
  filter: {
    type: EVENT_KEY,
  },
}

export const infinityContractMigrateEvent = eventHandler(
  HANDLER_KEY,
  EVENT_KEY,
  handlerFn,
)

async function handlerFn(
  blockHeight: number,
  timestamp: Date,
  migrateEvents: SanitizedEvent[],
  cosmosEvent: ModifiedCosmosEvent,
  childLogger: ChildLogger,
): Promise<void> {
  const contractMap = await dbContractsFromEvents(migrateEvents)

  if (
    !_.some(migrateEvents, (event) => {
      const { contractAddress } = event.expectUniqueKeys(['contractAddress'])
      return Boolean(contractMap[contractAddress])
    })
  ) {
    childLogger.warn('No contracts found for migrate events')
    return
  }

  assert(
    cosmosEvent.log,
    'Expected log in cosmosEvent, migrations in end blocker not supported',
  )

  const nativeMigrateEvents = _.filter(
    sanitizeEvents(cosmosEvent.log.events),
    (event) => event.type === 'migrate',
  )

  const codeIdMap = _.reduce(
    nativeMigrateEvents,
    (accum: Record<string, number>, event) => {
      const { contractAddress, codeId } = event.expectUniqueKeys([
        'contractAddress',
        'codeId',
      ])
      accum[contractAddress] = parseInt(codeId, 10)
      return accum
    },
    {},
  )

  const dbContracts = []

  let internalIdx = -1
  for (const migrateEvent of migrateEvents) {
    internalIdx += 1

    const { contractAddress } = migrateEvent.expectUniqueKeys([
      'contractAddress',
    ])

    if (!contractMap[contractAddress]) {
      childLogger.warn(`Contract not found for contract ${contractAddress}`)
      continue
    }

    const { toName, toVersion } = migrateEvent.expectUniqueKeys([
      'toName',
      'toVersion',
    ])

    const codeId = codeIdMap[contractAddress]

    const migrateContract = Contract.create({
      id: `${contractAddress}-${codeId}`,
      blockHeight,
      created: timestamp,
      address: contractAddress,
      codeId,
      name: toName,
      version: toVersion,
    })
    dbContracts.push(migrateContract)
  }

  await store.bulkCreate('Contract', dbContracts)
}
