import { Pot, Transaction } from "../lib/types";

export const getPotColor = (pots: Pot[], transaction: Transaction) => {
  let color: string | undefined = undefined;

  const foundPot = pots.find((pot) =>
    pot.transactions.find((podTran) => podTran.id === transaction.id)
  );

  if (foundPot) {
    return foundPot.color;
  }

  return color;
};
