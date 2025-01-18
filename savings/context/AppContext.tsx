import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { BankAccount, Pot, ReturnedTransactions } from "../lib/types";
import { Platform } from "react-native";
import { spendingPotsSample } from "../lib/sampleData";

interface AppContextProps {
  transactions: ReturnedTransactions[];
  bankCards: BankAccount[];
  loadingTransactions: boolean;
  loadingBankCards: boolean;
  selectedCard: BankAccount | null;
  selectAllCards: boolean;
  currentMonth: Date;
  pots: Pot[];
  getBalance: (access_tokens: string[]) => Promise<void>;
  getCards: (firstLoad?: boolean) => Promise<void>;
  setToken: () => Promise<void>;
  setSelectedCard: React.Dispatch<React.SetStateAction<BankAccount | null>>;
  setSelectAllCards: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  setLoadingTransactions: React.Dispatch<React.SetStateAction<boolean>>;
  setTransactions: React.Dispatch<React.SetStateAction<ReturnedTransactions[]>>;
  setBankCards: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setLoadingBankCards: React.Dispatch<React.SetStateAction<boolean>>;
  setPots: React.Dispatch<React.SetStateAction<Pot[]>>;
  getPots: () => Promise<void>;
  addPotQuery: (pot: Pot) => Promise<void>;
  updatePotQuery: (pot: Pot) => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) => {
  const [transactions, setTransactions] = useState<ReturnedTransactions[]>([]);
  const [bankCards, setBankCards] = useState<BankAccount[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingBankCards, setLoadingBankCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BankAccount | null>(null);
  const [selectAllCards, setSelectAllCards] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pots, setPots] = useState<Pot[]>([]);

  const address =
    Platform.OS === "ios" ? process.env.EXPO_PUBLIC_BACKEND_URL : "10.0.2.2";

  const getBalance = useCallback(
    async (access_tokens: string[]) => {
      setLoadingTransactions(true);
      try {
        const response = await fetch(`${address}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            currentMonth,
            access_token: access_tokens,
          }),
        });

        if (!response.ok) {
          console.log("Error response getting balance", response);
          setLoadingTransactions(false);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setTransactions(data.transactions);
        setLoadingTransactions(false);
      } catch (err) {
        setTransactions([]);
        console.log("Error fetching balance:", err);
        setLoadingTransactions(false);
      }
    },
    [currentMonth]
  );

  const getPots = useCallback(async () => {
    try {
      const response = await fetch(`${address}/get-pots`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          user_id: session.user.id,
        },
      });

      if (!response.ok) {
        console.log("Error response getting pots", response);
        setLoadingTransactions(false);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("data", response);

      const data = await response.json();

      setPots(data.pots);
    } catch (error) {
      console.log("Error fetching pots:", error);
    }
  }, []);

  const addPotQuery = useCallback(async (pot: Pot) => {
    try {
      const response = await fetch(`${address}/add-pot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          user_id: session.user.id,
        },
        body: JSON.stringify({
          label: pot.label,
          amount: pot.amount,
          color: pot.color,
          user_id: session.user.id,
          transactions: pot.transactions,
        }),
      });

      if (!response.ok) {
        console.log("Error response adding pots", response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await getPots();
    } catch (error) {
      console.log("Error adding pots:", error);
    }
  }, []);

  const updatePotQuery = useCallback(async (pot: Pot) => {
    try {
      const response = await fetch(`${address}/update-pot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          user_id: session.user.id,
        },
        body: JSON.stringify({
          id: pot.id,
          label: pot.label,
          amount: pot.amount,
          color: pot.color,
          user_id: session.user.id,
          transactions: pot.transactions,
        }),
      });

      if (!response.ok) {
        console.log("Error response updating pots", response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await getPots();
    } catch (error) {
      console.log("Error updating pots:", error);
    }
  }, []);

  const getCards = useCallback(async () => {
    setLoadingBankCards(true);
    try {
      console.log("getting bank cards!");
      await fetch(`${address}/get-banks`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then(async (bankDataValue: Response) => {
          const bankData = await bankDataValue.json();

          setBankCards(bankData);
          setLoadingBankCards(false);
        })
        .catch((error) => {
          setBankCards([]);
          setLoadingBankCards(false);

          throw new Error(`HTTP error! status: ${error.status}`);
        });
    } catch (err) {
      setBankCards([]);
      setLoadingBankCards(false);
      console.log("Error fetching balance:", err);
    }
  }, []);

  const setToken = async () => {
    try {
      await fetch(`${address}/set-tokens`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    setToken();
    getPots();
    getCards();
  }, []);

  useEffect(() => {
    if (bankCards.length > 1) {
      setSelectAllCards(true);
      const access_tokens = bankCards.map((bank) => bank.access_token);
      getBalance(access_tokens);
    } else if (bankCards.length === 1) {
      setSelectedCard(bankCards[0]);
      getBalance([bankCards[0].access_token]);
    }
  }, [bankCards, currentMonth]);

  return (
    <AppContext.Provider
      value={{
        selectAllCards,
        selectedCard,
        transactions,
        bankCards,
        loadingTransactions,
        loadingBankCards,
        currentMonth,
        pots,
        getBalance,
        getCards,
        setToken,
        setSelectedCard,
        setSelectAllCards,
        setCurrentMonth,
        setLoadingTransactions,
        setTransactions,
        setBankCards,
        setLoadingBankCards,
        setPots,
        getPots,
        addPotQuery,
        updatePotQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
