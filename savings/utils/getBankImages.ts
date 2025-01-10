const amex = require("../assets/images/banks/amex.png");
const hsbc = require("../assets/images/banks/hsbc.png");
const monzo = require("../assets/images/banks/monzo.png");
const natwest = require("../assets/images/banks/natwest.png");
const lloyds = require("../assets/images/banks/lloyds.png");

const cards: { [key: string]: any } = {
  Hsbc: hsbc,
  Lloyds: lloyds,
  Monzo: monzo,
  Natwest: natwest,
  AmericanExpress: amex,
};

const cardNames = Object.keys(cards);

export const getCardImage = (search: string): string => {
  const searchQuery = search.replace(/\s/g, "").toLowerCase();

  // Find the first card name that is included in the search query
  const filtered = cardNames.filter((card) =>
    searchQuery.includes(card.toLowerCase())
  );

  if (filtered.length !== 1) {
    return "";
  }

  // Return the value associated with the matched card name
  return cards[filtered[0]];
};
