const addBank = require("../assets/images/add-card.png");

const cards: { [key: string]: any } = {
  Hsbc: addBank,
  Lloyds: addBank,
};

const cardNames = Object.keys(cards);

const getCardImage = (search: string): string => {
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

console.log(getCardImage("hsbc personal")); // Output: 'www.hsbc.com'
console.log(getCardImage("Lloyds bank")); // Output: 'www.lloyds.com'
console.log(getCardImage("random text")); // Output: ''
