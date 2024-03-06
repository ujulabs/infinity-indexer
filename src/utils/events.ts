import type {
  Event,
  EventAttribute,
} from '@cosmjs/tendermint-rpc/build/tendermint37/responses'
import type { CosmosEvent, CosmosMessage } from '@subql/types-cosmos'
import _ from 'lodash'
import { PairEvent } from '../types'
import { blockTimeToDate } from './date'
import { parseB64 } from './parse'
import { type ModifiedCosmosEvent } from './modified-types'

type AttributeMap = Record<string, string[] | undefined>

export class SanitizedEvent {
  constructor(
    public type: string,
    private attributes: AttributeMap,
  ) {}

  getUniqueKey = (key: string): string | undefined => {
    return (this.attributes[key] || [])[0]
  }

  expectUniqueKeys = (keys: string[]): Record<string, string> => {
    const retval: Record<string, string> = {}
    const missingKeys: string[] = []
    for (const key of keys) {
      const value = this.getUniqueKey(key)
      if (value) {
        retval[key] = value
      } else {
        missingKeys.push(key)
      }
    }
    if (missingKeys.length > 0) {
      throw new Error(`Missing keys: ${missingKeys.join(', ')}`)
    }
    return retval
  }

  expectMultiKey = (key: string): string[] => {
    const retval = this.attributes[key]
    if (!retval) {
      throw new Error(`Missing key: ${key}`)
    }

    return retval
  }

  getEventId = (
    blockHeight: number,
    eventIdx: number,
    internalIdx: number,
  ): string => {
    return [
      blockHeight.toString(),
      eventIdx.toString(),
      internalIdx.toString(),
    ].join('-')
  }

  private serializeAttributes = (): EventAttribute[] => {
    const sortedKeys = _.keys(this.attributes).sort()
    return _.map(sortedKeys, (key) => {
      const uniqueValues = _.uniq(this.attributes[key])
      return {
        key,
        value: _.join(uniqueValues, ', '),
      }
    })
  }

  toPairEvent = (
    blockHeight: number,
    eventIdx: number,
    internalIdx: number,
    created: Date,
  ): PairEvent => {
    const { contractAddress } = this.expectUniqueKeys(['contractAddress'])

    return PairEvent.create({
      id: this.getEventId(blockHeight, eventIdx, internalIdx),
      blockHeight,
      eventIdx,
      internalIdx,
      created,
      pairId: contractAddress,
      type: this.type,
      attributes: this.serializeAttributes(),
    })
  }
}

export const attrArrayToMap = (
  attributes: readonly EventAttribute[],
): AttributeMap => {
  return _.reduce(
    attributes,
    (accum: AttributeMap, attr) => {
      const ccKey = _.camelCase(attr.key)
      if (accum[ccKey]) {
        accum[ccKey]?.push(attr.value)
      } else {
        accum[ccKey] = [attr.value]
      }
      return accum
    },
    {},
  )
}

export const isCwEvent = (eventType: string): boolean => {
  return _.startsWith(eventType, 'wasm')
}

export const isBase64 = (events: readonly Event[]): boolean => {
  const wasmEventWithAttributes = _.find(
    events,
    (event) => isCwEvent(event.type) && event.attributes.length > 0,
  )

  if (wasmEventWithAttributes) {
    return wasmEventWithAttributes.attributes[0].key !== '_contract_address'
  }

  const base64regex =
    // eslint-disable-next-line prefer-named-capture-group
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/

  const eventWithAttribute = _.find(
    events,
    (event) => event.attributes.length > 0,
  )

  let decodeB64 = false
  if (eventWithAttribute) {
    const key = eventWithAttribute.attributes[0].key
    decodeB64 = base64regex.test(key)
  }

  return decodeB64
}

// export const sanitizeEvent = (cosmosEvent: CosmosEvent): SanitizedEvent[] => {
//   return sanitizeEventsInternal(
//     cosmosEvent.block.header.height,
//     blockTimeToDate(cosmosEvent.block.block.header.time),
//     [{ idx: cosmosEvent.idx, ...cosmosEvent.event }],
//   )
// }

// export const sanitizeLogEvents = (
//   cosmosEvent: ModifiedCosmosEvent,
// ): SanitizedEvent[] => {
//   return sanitizeEventsInternal(
//     cosmosEvent.block.header.height,
//     blockTimeToDate(cosmosEvent.block.block.header.time),
//     _.map(cosmosEvent.log.events, (event, idx) => ({ idx, ...event })),
//   )
// }

// export const sanitizeMsgEvents = (
//   cosmosMessage: CosmosMessage,
// ): SanitizedEvent[] => {
//   return sanitizeEventsInternal(
//     cosmosMessage.block.header.height,
//     blockTimeToDate(cosmosMessage.block.block.header.time),
//     _.map(cosmosMessage.tx.tx.events, (event, idx) => ({ idx, ...event })),
//   )
// }

export const sanitizeEvents = (events: readonly Event[]): SanitizedEvent[] => {
  const decodeB64 = isBase64(events)

  return _.reduce(
    events,
    (eventAccum: SanitizedEvent[], event: Event) => {
      let attributes: readonly EventAttribute[]
      if (decodeB64) {
        attributes = _.map(event.attributes, (attr) => {
          return {
            key: parseB64(attr.key),
            value: parseB64(attr.value),
          }
        })
      } else {
        attributes = event.attributes
      }

      let attributeChunks: (readonly EventAttribute[])[]
      if (isCwEvent(event.type)) {
        attributeChunks = _.reduce(
          attributes,
          (attrAccum: EventAttribute[][], attr) => {
            const lastChunk = _.last(attrAccum)
            if (!lastChunk || attr.key === '_contract_address') {
              attrAccum.push([attr])
            } else {
              lastChunk.push(attr)
            }
            return attrAccum
          },
          [],
        )
      } else {
        attributeChunks = [attributes]
      }

      const sanitizedEvents = _.map(attributeChunks, (attrChunk) => {
        const attrMap = attrArrayToMap(attrChunk)
        return new SanitizedEvent(event.type, attrMap)
      })

      eventAccum.push(...sanitizedEvents)
      return eventAccum
    },
    [],
  )
}
