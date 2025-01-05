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
