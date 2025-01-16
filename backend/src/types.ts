export type TransactionType = {
  user_id: string;
  bank_id: string;
  amount: number;
  category: string;
  category_id: string;
  date: string;
  date_time: string | null;
  currency: string | null;
  merchant_name: string | null;
  name: string;
  transaction_code: string | null;
  transaction_id: string;
  transaction_type: string;
};

export type TransformedTransactions = {
  date: string;
  transactions: {
    amount: number | null;
    bank_id: string | null;
    category: string | null;
    category_id: string | null;
    currency: string | null;
    date: string | null;
    date_time: string | null;
    id: string;
    merchant_name: string | null;
    name: string | null;
    transaction_code: string | null;
    transaction_id: string | null;
    transaction_type: string | null;
    user_id: string | null;
  }[];
};
