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
  ScrollView,
  ImageBackground,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome6";
import { WebView } from "react-native-webview";
import { scaleDown } from "../utils/scaleDownPixels";
import { getCardImage } from "../utils/getBankImages";
import { useAppContext } from "../context/AppContext";
import { Transactions } from "../components/Transactions";
import { EditPotModal } from "../components/EditPotModal";
import { colorOptions } from "../constants/Colors";
import { SpendingPot } from "../components/SpendingPot";
import { Pot } from "../lib/types";

const addBank = require("../assets/images/add-card.png");
const allBanks = require("../assets/images/view-all.png");

const spendingPots: Pot[] = [
  {
    id: "1",
    label: "Add pot",
    amount: "0",
    icon: "",
    color: "",
    transactions: [],
  },
  {
    id: "2",
    label: "Groceries",
    amount: "280",
    icon: "🛒",
    color: "#1B5E20",
    transactions: [],
  },
  {
    id: "3",
    label: "Dining",
    amount: "-15",
    icon: "🍴",
    color: "#B71C1C",
    transactions: [],
  },
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
  const {
    bankCards,
    getBalance,
    getCards,
    loadingBankCards,
    setSelectAllCards,
    setSelectedCard,
    selectAllCards,
    selectedCard,
  } = useAppContext();

  const [isModalVisible, setModalVisible] = useState(false);
  const [plaidWebView, setPlaidWebView] = useState<string | null>(null);
  const [addBankModal, setAddBankModal] = useState(false);
  const [pots, setPots] = useState(spendingPots);
  const [newPotColor, setNewPotColor] = useState(colorOptions[0].code);
  const [newPotName, setNewPotName] = useState("");
  const [newPotAmount, setNewPotAmount] = useState("");

  const [editingPotIndex, setEditingPotIndex] = useState<number | null>(null);

  const address =
    Platform.OS === "ios" ? process.env.EXPO_PUBLIC_BACKEND_URL : "10.0.2.2";

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

  const logout = async () => {
    await supabase.auth.signOut();
    navigation.navigate("Login");
  };

  const resetModal = () => {
    setNewPotName("");
    setNewPotAmount("");
    setNewPotColor(colorOptions[0].code);
    setEditingPotIndex(null);
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
        transactions: [],
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

  useEffect(() => {
    if (!session.user) {
      logout();
    }
  }, []);

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
          await getCards();
          await getBalance(bankCards.map((bank) => bank.access_token));
        }}
      />
    </SafeAreaView>
  ) : (
    <View style={styles.mainContainer}>
      <SpendingPot
        pots={pots}
        logout={logout}
        setModalVisible={setModalVisible}
        openEditModal={openEditModal}
      />
      <Text style={styles.title}>Bank activity</Text>
      <View id="bank-activities" style={styles.bankActivities}>
        <ScrollView
          id="bank-cards"
          style={styles.bankCards}
          horizontal
          refreshControl={
            <RefreshControl
              refreshing={loadingBankCards}
              onRefresh={getCards}
            />
          }
        >
          <TouchableOpacity onPress={handleOpenLink}>
            <ImageBackground
              id="bankCard"
              imageStyle={{
                borderRadius: 15,
              }}
              source={addBank}
              style={styles.bankCard}
            ></ImageBackground>
          </TouchableOpacity>

          {bankCards.length > 1 && (
            <TouchableOpacity
              onPress={() => {
                setSelectedCard(null);
                setSelectAllCards(true);
                const access_tokens = bankCards.map(
                  (bank) => bank.access_token
                );
                getBalance(access_tokens);
              }}
            >
              <ImageBackground
                id="bankCard"
                imageStyle={{
                  borderRadius: 15,
                  borderColor: selectAllCards ? "limegreen" : undefined, // Add lime green border color
                  borderWidth: selectAllCards ? 3 : 0, // Add border width
                }}
                source={allBanks}
                style={styles.bankCard}
              ></ImageBackground>
            </TouchableOpacity>
          )}

          {bankCards.map((bank) => (
            <TouchableOpacity
              key={bank.id}
              onPress={() => {
                setSelectAllCards(false);
                setSelectedCard(bank);
                getBalance([bank.access_token]);
              }}
            >
              <ImageBackground
                key={bank.id}
                id={`bankCard ${bank.id}`}
                imageStyle={{
                  borderRadius: 15,
                  borderColor:
                    selectedCard?.id === bank.id ? "limegreen" : undefined, // Add lime green border color
                  borderWidth: selectedCard?.id === bank.id ? 3 : 0, // Add border width
                }}
                source={getCardImage(bank.bank_name) as any}
                style={styles.bankCard}
              ></ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Transactions pots={pots} setPots={setPots} />
      </View>
      <EditPotModal
        addOrUpdatePot={addOrUpdatePot}
        deletePot={deletePot}
        editingPotIndex={editingPotIndex}
        isModalVisible={isModalVisible}
        setModalVisible={setModalVisible}
        newPotName={newPotName}
        newPotAmount={newPotAmount}
        newPotColor={newPotColor}
        resetModal={resetModal}
        setNewPotName={setNewPotName}
        setNewPotColor={setNewPotColor}
        setNewPotAmount={setNewPotAmount}
      />
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

  calendarArrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  webview: {
    flexGrow: 1,
    width: "100%",
  },
});

export default HomeScreen;
