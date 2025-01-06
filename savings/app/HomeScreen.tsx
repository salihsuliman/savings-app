import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Button,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  StatusBar,
  ScrollView,
} from "react-native";

import { WebView } from "react-native-webview";

const spendingPots = [
  { id: "1", label: "Add pot", icon: null },
  { id: "2", label: "Groceries", amount: "£280", icon: "🛒", color: "#4CAF50" },
  { id: "3", label: "Dining", amount: "-£15", icon: "🍴", color: "#E57373" },
];

const bankCards = [
  { id: "1", label: "Add Card", icon: null },
  { id: "2", label: "AMEX", icon: "💳" },
  { id: "3", label: "Lloyds", icon: "🏦" },
];

export type RootStackParamList = {
  Home: undefined; // No parameters for Home screen
  Login: undefined; // No parameters for Success screen
};

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login",
  "Home"
>;

interface HomeScreenProps {
  session: Session;
  navigation: HomeScreenNavigationProp;
}

const HomeScreen = ({ session, navigation }: HomeScreenProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [plaidWebView, setPlaidWebView] = useState<string | null>(null);
  const [addBankModal, setAddBankModal] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const address =
    Platform.OS === "ios" ? process.env.EXPO_PUBLIC_BACKEND_URL : "10.0.2.2";

  const [newCard, setNewCard] = useState("");

  const changeMonth = (direction: number) => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + direction
    );
    setCurrentMonth(newMonth);
  };

  const formattedMonthYear = `${currentMonth.toLocaleString("default", {
    month: "long",
  })} ${currentMonth.getFullYear()}`;

  const createLinkToken = useCallback(async () => {
    console.log(1111);
    await fetch(`${address}/create_link_token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("set link token", data.hosted_link_url);
        setPlaidWebView(data.hosted_link_url);
        setAddBankModal(true);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const handleOpenLink = async () => {
    await createLinkToken();
  };

  const setToken = async () => {
    try {
      const response = await fetch(`${address}/set-tokens`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      console.log(data);
    } catch (err) {
      console.log(err);
    }
  };

  // Fetch balance data
  const getBalance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${address}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          currentMonth,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("returned balance", data.Balance);
      setData(data.Balance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]); // Added dependencies to the useCallback dependency array

  useEffect(() => {
    setToken();
    getBalance();
  }, []);

  useEffect(() => {
    getBalance();
  }, [currentMonth]);

  // const renderBankActivity = ({ item }: { item: any }) => (
  //   <View style={styles.transaction}>
  //     <View
  //       style={[
  //         styles.transactionIconContainer,
  //         { backgroundColor: item.color },
  //       ]}
  //     >
  //       <Text style={styles.transactionIcon}>{item.icon}</Text>
  //     </View>
  //     <View style={styles.transactionDetails}>
  //       <Text style={styles.transactionTitle}>{item.name}</Text>
  //       <Text style={styles.transactionAmount}>
  //         {item.iso_currency_code} {item.amount}
  //       </Text>
  //       <Text style={styles.transactionDate}>{item.date}</Text>
  //     </View>
  //   </View>
  // );

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.title}>Spending pot</Text>
      <View id="spending-pot" style={styles.spendingPot}></View>
      <Text style={styles.title}>Bank activity</Text>
      <View id="bank-activities" style={styles.bankActivities}>
        <ScrollView id="bank-cards" style={styles.bankCards} horizontal>
          {Array.from({ length: 12 }).map((_, index) => (
            <TouchableOpacity key={index} id="bankCard" style={styles.bankCard}>
              <Text></Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View id="transaction-month" style={styles.transactionMonth}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Text style={styles.calendarArrow}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>{formattedMonthYear}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Text style={styles.calendarArrow}>{">"}</Text>
          </TouchableOpacity>
        </View>
        <View id="transaction" style={styles.transactions}></View>
      </View>
    </View>
  );
};

// function notifyMessage(msg: string) {
//   if (Platform.OS === "android") {
//     ToastAndroid.show(msg, ToastAndroid.SHORT);
//   } else {
//     Alert.alert(msg);
//   }
// }

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#3629B7", // Match your container background
    paddingTop: Platform.OS === "android" ? 24 : 45, // Extra padding for Android devices
  },
  spendingPot: {
    flex: 1,
    margin: 10,
    backgroundColor: "white",
    borderRadius: 50,
  },
  bankActivities: {
    flex: 3,
    marginBottom: 0,
    borderRadius: 50,
    backgroundColor: "white",
  },
  title: {
    fontSize: 40,
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 10,
  },
  bankCards: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 30,
    flexGrow: 0,
    backgroundColor: "white",
  },
  bankCard: {
    height: 50,
    width: 80,
    color: "black",
    borderRadius: 10,
    backgroundColor: "#d3d3d3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
    margin: 5,
  },
  transactionMonth: {
    flex: 1,
    margin: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarArrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  transactions: {
    flex: 12,
    backgroundColor: "black",
  },
});

export default HomeScreen;
