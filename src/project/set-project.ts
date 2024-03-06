import {
  CosmosDatasourceKind,
  type CosmosProject,
  type CosmosRuntimeDatasource,
} from '@subql/types-cosmos'
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import baseProject from './baseProject.json'

import * as infinityContractMigrateEvent from '../mappings/contract-migrate-event'
import * as infinityBuilderInstantiateMsg from '../mappings/infinityBuilder/instantiate-msg'
import * as infinityBuilderInstantiate2Msg from '../mappings/infinityBuilder/instantiate2-msg'
import * as infinityFactoryCreatePairEvent from '../mappings/infinityFactory/factory-create-pair-event'
import * as infinityFactoryCreatePair2Event from '../mappings/infinityFactory/factory-create-pair2-event'
import * as infinityGlobalUpdateConfigEvent from '../mappings/infinityGlobal/update-config-event'
import * as infinityPairCreatePairEvent from '../mappings/infinityPair/create-pair-event'
import * as infinityPairDepositNftEvent from '../mappings/infinityPair/deposit-nft-event'
import * as infinityPairDepositNftsEvent from '../mappings/infinityPair/deposit-nfts-event'
import * as infinityPairDepositTokensEvent from '../mappings/infinityPair/deposit-tokens-event'
import * as infinityPairMigratePairEvent from '../mappings/infinityPair/migrate-pair-event'
import * as infinityPairPairInternalEvent from '../mappings/infinityPair/pair-internal-event'
import * as infinityPairSwapNftForTokensEvent from '../mappings/infinityPair/swap-nft-for-tokens-event'
import * as infinityPairSwapTokensForNftEvent from '../mappings/infinityPair/swap-tokens-for-nft-event'
import * as infinityPairUpdatePairEvent from '../mappings/infinityPair/update-pair-event'
import * as infinityPairWithdrawNftEvent from '../mappings/infinityPair/withdraw-nft-event'
import * as infinityPairWithdrawNftsEvent from '../mappings/infinityPair/withdraw-nfts-event'
import * as infinityPairWithdrawTokensEvent from '../mappings/infinityPair/withdraw-tokens-event'
import * as infinityRouterSwapNftsForTokensEvent from '../mappings/infinityRouter/router-swap-nfts-for-tokens-event'
import * as infinityRouterSwapTokensForNftsEvent from '../mappings/infinityRouter/router-swap-tokens-for-nfts-event'

type MyCosmosProject = Omit<CosmosProject, 'dataSources'> & {
  dataSources: CosmosRuntimeDatasource[]
}

// eslint-disable-next-line @typescript-eslint/require-await
const setProject = async (): Promise<void> => {
  const networkArg = process.argv[2]

  console.log(`\n Setting up ${networkArg} project`)

  const project: MyCosmosProject = { ...baseProject }

  project.network.chaintypes = new Map([
    [
      'cosmos.base.v1beta1.coin',
      {
        file: './proto/cosmos/base/v1beta1/coin.proto',
        messages: ['Coin'],
      },
    ],
    [
      'cosmwasm.wasm.v1.tx',
      {
        file: './proto/cosmwasm/wasm/v1/tx.proto',
        messages: [
          'MsgInstantiateContract',
          'MsgExecuteContract',
          'MsgInstantiateContract2',
          'MsgMigrateContract',
        ],
      },
    ],
  ])

  project.dataSources = [
    {
      // Protocol instantiation
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          infinityBuilderInstantiateMsg.handler,
          infinityBuilderInstantiate2Msg.handler,
        ],
      },
    },
    {
      // Ongoing events
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          infinityContractMigrateEvent.handler,
          infinityGlobalUpdateConfigEvent.handler,
          infinityPairCreatePairEvent.handler,
          infinityPairDepositTokensEvent.handler,
          infinityPairWithdrawTokensEvent.handler,
          infinityPairUpdatePairEvent.handler,
          infinityPairSwapNftForTokensEvent.handler,
          infinityPairSwapTokensForNftEvent.handler,
        ],
      },
    },
    {
      // v0.1 Pair events
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          infinityPairDepositNftEvent.handler,
          infinityPairWithdrawNftEvent.handler,
        ],
      },
    },
    {
      // v0.2 Pair events
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          infinityFactoryCreatePairEvent.handler,
          infinityFactoryCreatePair2Event.handler,
          infinityPairMigratePairEvent.handler,
          infinityPairDepositNftsEvent.handler,
          infinityPairWithdrawNftsEvent.handler,
          infinityPairPairInternalEvent.handler,
          infinityRouterSwapNftsForTokensEvent.handler,
          infinityRouterSwapTokensForNftsEvent.handler,
        ],
      },
    },
  ]

  if (networkArg === 'localnet') {
    project.network.chainId = 'testing'
    project.network.endpoint = ['http://stargaze:26657']
  } else if (networkArg === 'elgafar') {
    project.network.chainId = 'elgafar-1'
    project.network.endpoint = ['https://rpc.elgafar-1.stargaze-apis.com']

    const [
      protocolInstantiationDataSource,
      ongoingEventsDataSource,
      v01EventsDataSource,
      v02EventsDataSource,
    ] = project.dataSources

    const instantiatedHeight = 7055291
    const factoryMigratedHeight = 7880903
    const pairMigrationHeight = 7880987

    protocolInstantiationDataSource.startBlock = instantiatedHeight
    protocolInstantiationDataSource.endBlock = instantiatedHeight

    ongoingEventsDataSource.startBlock = instantiatedHeight
    ongoingEventsDataSource.endBlock = undefined

    v01EventsDataSource.startBlock = instantiatedHeight
    v01EventsDataSource.endBlock = pairMigrationHeight

    v02EventsDataSource.startBlock = factoryMigratedHeight
    v02EventsDataSource.endBlock = undefined
  } else if (networkArg === 'stargaze') {
    project.network.chainId = 'stargaze-1'
    project.network.endpoint = [
      'https://rpc.full-nodes.stargaze-1.stargaze.build',
    ]

    const [
      protocolInstantiationDataSource,
      ongoingEventsDataSource,
      v01EventsDataSource,
      v02EventsDataSource,
    ] = project.dataSources

    const instantiatedHeight = 10327462
    const factoryMigratedHeight = 11669168
    const pairMigrationHeight = 11669303

    protocolInstantiationDataSource.startBlock = instantiatedHeight
    protocolInstantiationDataSource.endBlock = instantiatedHeight

    ongoingEventsDataSource.startBlock = instantiatedHeight
    ongoingEventsDataSource.endBlock = undefined

    v01EventsDataSource.startBlock = instantiatedHeight
    v01EventsDataSource.endBlock = pairMigrationHeight

    v02EventsDataSource.startBlock = factoryMigratedHeight
  } else {
    throw new Error(`Invalid network ${networkArg}`)
  }

  const outputFilePath = path.resolve(__dirname, '../../project.yaml')
  fs.writeFileSync(outputFilePath, YAML.stringify(project))

  console.log(`Done!\n`)
}

setProject().catch((err) => {
  console.error(err)
  process.exit(1)
})
