import type { CosmosMessage } from "@subql/types-cosmos"
import _ from "lodash"
import semver from "semver"
import { Contract } from "../types"
import { blockTimeToDate } from "./date"
import { type SanitizedEvent, sanitizeEvents } from "./events"
import type { ChildLogger } from "./handler"
import { addressesFromEvents } from "./pair"

export const latestContractByName = async (
  name: string
): Promise<Contract | undefined> => {
  const contracts = await Contract.getByFields([["name", "=", name]], {
    limit: 1,
    orderBy: "created",
    orderDirection: "DESC"
  })
  if (contracts.length === 0) {
    return undefined
  }
  return _.sortBy(contracts, "created")[contracts.length - 1]
}

export const latestContractByAddress = async (
  contractAddress: string
): Promise<Contract | undefined> => {
  const contracts = await Contract.getByFields(
    [["address", "=", contractAddress]],
    {
      limit: 1,
      orderBy: "created",
      orderDirection: "DESC"
    }
  )
  if (contracts.length === 0) {
    return undefined
  }
  return _.sortBy(contracts, "created")[contracts.length - 1]
}

export const dbContractsFromEvents = async (
  events: SanitizedEvent[]
): Promise<Record<string, Contract | undefined>> => {
  const fetchContractPromise = async (
    address: string
  ): Promise<[string, Contract | undefined]> => {
    return [address, await latestContractByAddress(address)]
  }

  const pairAddresses = addressesFromEvents(events)
  const contractPromises = Array.from(pairAddresses).map(fetchContractPromise)

  const contractMap = _.reduce(
    await Promise.all(contractPromises),
    (accum: Record<string, Contract | undefined>, [address, contract]) => {
      accum[address] = contract
      return accum
    },
    {}
  )
  return contractMap
}

export const expectContract = async (name: string): Promise<Contract> => {
  const contract = await latestContractByName(name)
  if (!contract) {
    throw new Error(`Contract ${name} not found`)
  }
  return contract
}

export const expectContractGteVersion = async (
  name: string,
  version: string
): Promise<Contract> => {
  const contract = await expectContract(name)
  if (semver.gte(contract.version, version)) {
    throw new Error(
      `Contract ${name} is not at version ${version} or greater, skipping`
    )
  }
  return contract
}

export const createdContractsFromEvents = (
  blockHeight: number,
  created: Date,
  sanitizedEvents: SanitizedEvent[]
): Contract[] => {
  const nativeInstantiateEvents = _.filter(
    sanitizedEvents,
    (event) => event.type === "instantiate"
  )

  const codeIdMap = _.reduce(
    nativeInstantiateEvents,
    (accum: Record<string, number>, event) => {
      const { contractAddress, codeId } = event.expectUniqueKeys([
        "contractAddress",
        "codeId"
      ])
      accum[contractAddress] = parseInt(codeId, 10)
      return accum
    },
    {}
  )

  const wasmInstantiateEvents = _.filter(
    sanitizedEvents,
    (event) => event.getUniqueKey("action") === "instantiate"
  )

  const dbContracts = _.map(wasmInstantiateEvents, (event) => {
    const { contractAddress, contractName, contractVersion } =
      event.expectUniqueKeys([
        "contractAddress",
        "contractName",
        "contractVersion"
      ])

    const codeId = codeIdMap[contractAddress]

    return Contract.create({
      id: `${contractAddress}-${codeId}`,
      blockHeight,
      created,
      address: contractAddress,
      codeId,
      name: contractName,
      version: contractVersion
    })
  })

  return dbContracts
}
