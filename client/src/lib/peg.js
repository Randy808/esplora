const isNonNegativeNumber = value => Number.isFinite(value) && value >= 0

export const getPegAccounting = (chainStats = {}) => {
  const pegInAmount = chainStats.peg_in_amount
      , pegOutAmount = chainStats.peg_out_amount
      , federationAssets = isNonNegativeNumber(pegInAmount) &&
          isNonNegativeNumber(pegOutAmount) && pegInAmount >= pegOutAmount
          ? pegInAmount - pegOutAmount
          : null

  return {
    pegInAmount
  , pegOutAmount
  , federationAssets
  }
}
