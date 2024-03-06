/* eslint-disable @typescript-eslint/no-explicit-any */
export const parseB64Json = (data: any): any => {
  return JSON.parse(parseB64(data))
}

export const parseB64 = (data: any): string => {
  return Buffer.from(data, 'base64').toString()
}
