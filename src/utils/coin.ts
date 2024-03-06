import _ from 'lodash'

export const parseCosmosCoin = (
  coinStr: string,
): { amount: string; denom: string } => {
  // Find the first non-numeric character's index
  const firstNonNumericIndex = [...coinStr].findIndex(
    (char) => !_.isNumber(char),
  )

  if (firstNonNumericIndex === -1) {
    // Return null or throw an error if no non-numeric characters are found
    throw new Error('Invalid coin string')
  }

  // Split the string into amount and denom
  const amount = coinStr.substring(0, firstNonNumericIndex)
  const denom = coinStr.substring(firstNonNumericIndex)

  return { amount, denom }
}
