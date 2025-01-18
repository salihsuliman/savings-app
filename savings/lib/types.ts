export type Transaction = {
  id: string;
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

export type ReturnedTransactions = {
  date: string;
  transactions: Transaction[];
};

export type BankAccount = {
  id: string;
  created_at: string;
  access_token: string;
  bank_name: string;
  item_id: string;
  user_id: string;
};

export type Pot = {
  id?: string;
  label: string;
  amount: string;
  color: string;
  transactions: Transaction[];
};
