import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Button,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/FontAwesome6";
import { WebView } from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import { Transaction } from "../lib/types";
import { scaleDown } from "../utils/scaleDownPixels";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

const addBank = require("../assets/images/add-card.png");
const addPot = require("../assets/images/add-pot.png");

const spendingPots = [
  { id: "1", label: "Add pot", amount: "0", icon: "", color: "" },
  { id: "2", label: "Groceries", amount: "£280", icon: "🛒", color: "#1B5E20" },
  { id: "3", label: "Dining", amount: "-£15", icon: "🍴", color: "#B71C1C" },
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

const colorOptions = [
  { name: "Black", code: "#1A1A1A" },
  { name: "Blue", code: "#0D47A1" },
  { name: "Red", code: "#B71C1C" },
  { name: "Green", code: "#1B5E20" },
  { name: "Purple", code: "#4A148C" },
  { name: "Orange", code: "#F57F17" },
  { name: "Teal", code: "#004D40" },
  { name: "Gray", code: "#263238" },
  { name: "Pink", code: "#880E4F" },
  { name: "Brown", code: "#3E2723" },
  { name: "Indigo", code: "#303F9F" },
  { name: "Amber", code: "#FF6F00" },
  { name: "Cyan", code: "#00796B" },
  { name: "Dark Gray", code: "#212121" },
  { name: "Deep Purple", code: "#6A1B9A" },
];

const HomeScreen = ({ session, navigation }: HomeScreenProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [plaidWebView, setPlaidWebView] = useState<string | null>(null);
  const [addBankModal, setAddBankModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [pots, setPots] = useState(spendingPots);
  const [newPotName, setNewPotName] = useState("");
  const [newPotAmount, setNewPotAmount] = useState("");
  const [newPotColor, setNewPotColor] = useState(colorOptions[0].code);
  const [editingPotIndex, setEditingPotIndex] = useState<number | null>(null);

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
    await fetch(`${address}/create_link_token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
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
      setTransactions([]);
      console.log("Error fetching balance:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentMonth]); // Added dependencies to the useCallback dependency array

  const logout = async () => {
    await supabase.auth.signOut();
    navigation.navigate("Login");
  };

  const addOrUpdatePot = () => {
    if (!newPotName || !newPotAmount) {
      Alert.alert(
        "Validation Error",
        "Please fill in both the pot name and amount."
      );
      return;
    }

    if (editingPotIndex !== null) {
      // Update existing pot
      const updatedPots = [...pots];
      updatedPots[editingPotIndex] = {
        ...updatedPots[editingPotIndex],
        label: newPotName,
        amount: newPotAmount,
        color: newPotColor,
      };
      setPots(updatedPots);
    } else {
      // Add new pot
      const newPot = {
        id: (pots.length + 1).toString(),
        label: newPotName,
        amount: newPotAmount,
        color: newPotColor,
        icon: "",
      };
      setPots([...pots, newPot]);
    }
    setModalVisible(false);
    resetModal();
  };

  const deletePot = () => {
    if (editingPotIndex !== null) {
      const updatedPots = pots.filter((_, index) => index !== editingPotIndex);
      setPots(updatedPots);
      setModalVisible(false);
      resetModal();
    }
  };

  const openEditModal = (index: number) => {
    const pot = pots[index];

    if (pot) {
      setNewPotName(pot.label);
      setNewPotAmount(pot.amount);
      setNewPotColor(pot.color);
      setEditingPotIndex(index);
      setModalVisible(true);
    }
  };

  const resetModal = () => {
    setNewPotName("");
    setNewPotAmount("");
    setNewPotColor(colorOptions[0].code);
    setEditingPotIndex(null);
  };

  useEffect(() => {
    setToken();
    getBalance();
  }, []);

  useEffect(() => {
    getBalance();
  }, [currentMonth]);

  return addBankModal ? (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{
          uri: plaidWebView || "",
        }}
        style={styles.webview}
      />
      <Button
        title="Close"
        onPress={async () => {
          setAddBankModal(false);
          await getBalance();
        }}
      />
    </SafeAreaView>
  ) : (
    <View style={styles.mainContainer}>
      <View style={styles.firstTitleSection}>
        <Text style={styles.title}>Spending pot</Text>
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Icon name="right-from-bracket" size={30} color={"#3629B7"} />
        </TouchableOpacity>
      </View>
      <ScrollView id="spending-pots" style={styles.spendingPot} horizontal>
        {pots.map((pot, index) =>
          index === 0 ? (
            <TouchableOpacity
              key={index}
              style={{
                ...styles.potContainer,
              }}
              onPress={() => setModalVisible(true)}
            >
              <ImageBackground
                key={index}
                id="savingPot"
                style={styles.pot}
                imageStyle={{
                  borderRadius: 10,
                }}
                source={addPot}
              ></ImageBackground>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={index}
              style={{
                ...styles.potContainer,
              }}
              onPress={() => openEditModal(index)}
            >
              <View
                key={index}
                id="savingPot"
                style={{ ...styles.pot, backgroundColor: pot.color }}
              >
                <Text
                  style={{
                    fontSize: scaleDown(10, scale),
                    fontWeight: "700",
                    padding: 5,
                    color: "white",
                  }}
                >
                  {pot.label}
                </Text>
              </View>

              <Text style={{ fontSize: 18, marginTop: 8, fontWeight: "600" }}>
                {pot.amount}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
      <Text style={styles.title}>Bank activity</Text>
      <View id="bank-activities" style={styles.bankActivities}>
        <ScrollView id="bank-cards" style={styles.bankCards} horizontal>
          {Array.from({ length: 5 }).map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={index === 0 ? handleOpenLink : () => {}}
            >
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
          refreshControl={
            <RefreshControl
              refreshing={loadingTransactions}
              onRefresh={getBalance}
            />
          }
        >
          {!transactions || loadingTransactions ? (
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
                        colorOptions[
                          Math.floor(Math.random() * colorOptions.length)
                        ].code,
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
      <Modal isVisible={isModalVisible}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {editingPotIndex !== null ? "Edit Pot" : "Add New Pot"}
          </Text>
          <View style={styles.textFieldContainer}>
            <Text style={styles.textFieldTitle}>Pot name</Text>
            <TextInput
              style={styles.input}
              placeholder="Pot Name"
              value={newPotName}
              onChangeText={setNewPotName}
            />
          </View>
          <View style={styles.textFieldContainer}>
            <Text style={styles.textFieldTitle}>Pot amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Pot Amount"
              value={newPotAmount}
              onChangeText={setNewPotAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.colorPickerContainer}>
            <Picker
              selectedValue={newPotColor}
              style={styles.picker}
              onValueChange={(itemValue) => setNewPotColor(itemValue)}
            >
              {colorOptions.map((color, index) => (
                <Picker.Item
                  key={index}
                  label={color.name}
                  value={color.code}
                />
              ))}
            </Picker>
            <View
              style={[styles.colorPreview, { backgroundColor: newPotColor }]}
            />
          </View>
          <View style={styles.modalButtons}>
            {editingPotIndex !== null && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={deletePot}
              >
                <Text style={styles.buttonText}>Delete Pot</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setModalVisible(false);
                resetModal();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={addOrUpdatePot}
            >
              <Text style={styles.buttonText}>
                {editingPotIndex !== null ? "Update Pot" : "Add Pot"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#3629B7", // Match your container background
    paddingTop: Platform.OS === "android" ? 24 : 45, // Extra padding for Android devices
  },

  title: {
    fontSize: 40,
    color: "white",
    fontWeight: 700,
    textAlign: "center",
    marginVertical: 20,
  },
  firstTitleSection: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  logout: {
    backgroundColor: "white",
    height: 50,
    width: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
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
    justifyContent: "center",
    alignItems: "center",
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
  webview: {
    flexGrow: 1,
    width: "100%",
  },
  modalContainer: {
    flexGrow: 0,
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 60,
    borderColor: "gray",
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  textFieldContainer: {
    width: "100%",
    marginBottom: 20,
  },

  textFieldTitle: {
    fontSize: 18,
    fontWeight: 400,
    marginBottom: 10,
  },

  colorPickerContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  picker: {
    width: "60%",
    height: "100%",
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 20,
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    borderRadius: 5,
    padding: 10,
    margin: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#d9534f",
  },
  addButton: {
    backgroundColor: "#5cb85c",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default HomeScreen;
