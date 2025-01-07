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
  Image,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  StatusBar,
  ScrollView,
  ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";

import { WebView } from "react-native-webview";
import { Transaction } from "../lib/types";

const addBank = require("../assets/images/add-card.png");
const addPot = require("../assets/images/add-pot.png");

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

const transactionColours = [
  "#1A1A1A",
  "#0D47A1",
  "#B71C1C",
  "#1B5E20",
  "#4A148C",
  "#F57F17",
  "#004D40",
  "#263238",
  "#880E4F",
  "#3E2723",
  "#303F9F",
  "#FF6F00",
  "#00796B",
  "#212121",
  "#6A1B9A",
];

const HomeScreen = ({ session, navigation }: HomeScreenProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [plaidWebView, setPlaidWebView] = useState<string | null>(null);
  const [addBankModal, setAddBankModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
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
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTransactions(data.Balance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentMonth]); // Added dependencies to the useCallback dependency array

  useEffect(() => {
    setToken();
    getBalance();
  }, []);

  useEffect(() => {
    getBalance();
  }, [currentMonth]);

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.title}>Spending pot</Text>
      <ScrollView id="bank-cards" style={styles.spendingPot} horizontal>
        {Array.from({ length: 3 }).map((_, index) =>
          index === 0 ? (
            <TouchableOpacity
              key={index}
              style={{
                ...styles.potContainer,
                height: 110,
              }}
            >
              <ImageBackground
                key={index}
                id="savingPot"
                source={addPot}
                imageStyle={{ borderRadius: 10 }}
                style={styles.pot}
              ></ImageBackground>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={index} style={styles.potContainer}>
              <View key={index} id="savingPot" style={styles.pot}></View>

              <Text style={{ fontSize: 18, marginTop: 8, fontWeight: 600 }}>
                £100
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
      <Text style={styles.title}>Bank activity</Text>
      <View id="bank-activities" style={styles.bankActivities}>
        <ScrollView id="bank-cards" style={styles.bankCards} horizontal>
          {Array.from({ length: 5 }).map((_, index) => (
            <TouchableOpacity key={index}>
              <ImageBackground
                key={index}
                id="bankCard"
                imageStyle={{ borderRadius: 15 }}
                source={index === 0 && addBank}
                style={styles.bankCard}
              ></ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View id="transaction-month" style={styles.transactionMonth}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Icon name="chevron-left" size={30} />
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>{formattedMonthYear}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Icon name="chevron-right" size={30} />
          </TouchableOpacity>
        </View>
        <ScrollView
          id="transaction"
          style={styles.transactions}
          horizontal={false}
        >
          {loadingTransactions ? (
            <ActivityIndicator size="large" />
          ) : (
            transactions.map((trans, index) => (
              <TouchableOpacity
                key={index}
                id="bankCard"
                style={styles.bankTransaction}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      ...styles.bankTransactionIcon,
                      backgroundColor:
                        transactionColours[
                          Math.floor(Math.random() * transactionColours.length)
                        ],
                    }}
                  ></View>
                  <Text style={styles.bankTransactionName}>{trans.name}</Text>
                </View>
                <Text
                  style={styles.bankTransactionAmount}
                >{`- £${trans.amount}`}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#3629B7", // Match your container background
    paddingTop: Platform.OS === "android" ? 24 : 45, // Extra padding for Android devices
  },
  spendingPot: {
    flexGrow: 0,
    paddingVertical: 5,
    paddingHorizontal: 30,
    backgroundColor: "white",
    marginHorizontal: 10,
    borderRadius: 50,
  },
  pot: {
    height: 90,
    width: 70,
    flexDirection: "row",
    color: "black",
    borderRadius: 10,
    backgroundColor: "#d9d9d9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
    margin: 5,
  },

  potContainer: {
    alignItems: "center",
  },

  bankActivities: {
    flex: 5,
    marginBottom: 0,
    borderRadius: 50,
    backgroundColor: "white",
  },
  title: {
    fontSize: 40,
    color: "white",
    fontWeight: 700,
    textAlign: "center",
    marginVertical: 20,
  },
  bankCards: {
    marginTop: 5,
    marginHorizontal: 30,
    flexGrow: 0,
    height: 70,
    borderRadius: 10,
  },
  bankCard: {
    height: 40,
    width: 75,
    color: "black",
    borderRadius: 10,
    backgroundColor: "#d9d9d9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, // Adjust height to create bottom shadow
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5, // For Android shadow
    margin: 5,
  },
  transactionMonth: {
    flexGrow: 0,
    marginTop: 10,
    margin: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
  },
  calendarArrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  calendarMonth: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  transactions: {
    borderRadius: 30,
    marginBottom: 20,
  },
  bankTransaction: {
    height: 70,
    marginHorizontal: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 5,
    color: "black",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
    margin: 5,
  },

  bankTransactionIcon: {
    height: 50,
    width: 50,
    borderRadius: 10,
    marginRight: 15,
  },
  bankTransactionName: {
    fontSize: 17,
    fontWeight: 600,
  },
  bankTransactionAmount: {
    fontSize: 17,
    fontWeight: 600,
    color: "red",
  },
});

export default HomeScreen;
