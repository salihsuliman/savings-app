import { Transaction } from "../lib/types";
import { categoryIconMap } from "./constants";

export const getTransactionIcon = (transaction: Transaction): string => {
  const categoryId = transaction.category_id;
  return categoryIconMap[categoryId] || "circle-question"; // Default icon if category_id is not found
};
