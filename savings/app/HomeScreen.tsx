import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  RefreshControl,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { getCardImage } from "../utils/getBankImages";
import { useAppContext } from "../context/AppContext";
import { Transactions } from "../components/Transactions";
import { EditPotModal } from "../components/EditPotModal";
import { colorOptions } from "../constants/Colors";
import { SpendingPot } from "../components/SpendingPot";
import { BankAccount, Pot } from "../lib/types";
import Modal from "react-native-modal";

const addBank = require("../assets/images/add-card.png");
const allBanks = require("../assets/images/view-all.png");

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
    pots,
    setPots,
    bankCards,
    getBalance,
    getCards,
    loadingBankCards,
    setSelectAllCards,
    setSelectedCard,
    selectAllCards,
    selectedCard,
    addPotQuery,
    updatePotQuery,
    removeCard,
  } = useAppContext();

  const [isModalVisible, setModalVisible] = useState(false);
  const [isRemoveBankModal, setRemoveBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [plaidWebView, setPlaidWebView] = useState<string | null>(null);
  const [addBankModal, setAddBankModal] = useState(false);
  const [newPotColor, setNewPotColor] = useState(colorOptions[0].code);
  const [newPotName, setNewPotName] = useState("");
  const [newPotAmount, setNewPotAmount] = useState("");

  const [editingPot, setEditingPot] = useState<Pot | null>(null);

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
    setEditingPot(null);
  };

  const addOrUpdatePot = async () => {
    if (!newPotName || !newPotAmount) {
      Alert.alert(
        "Validation Error",
        "Please fill in both the pot name and amount."
      );
      return;
    }

    if (editingPot !== null) {
      const updatedPot: Pot = {
        id: editingPot.id,
        label: newPotName,
        amount: newPotAmount,
        color: newPotColor,
        transactions: editingPot.transactions,
      };

      await updatePotQuery(updatedPot);
    } else {
      // Add new pot
      const newPot = {
        label: newPotName,
        amount: newPotAmount,
        color: newPotColor,
        transactions: [],
      };
      await addPotQuery(newPot);
    }
    setModalVisible(false);
    resetModal();
  };

  const deletePot = () => {
    if (editingPot !== null) {
      const updatedPots = pots.filter((pots) => pots.id !== editingPot.id);
      setPots(updatedPots);
      setModalVisible(false);
    }
  };

  const openEditModal = (pot: Pot) => {
    setNewPotName(pot.label);
    setNewPotAmount(pot.amount.toString());
    setNewPotColor(pot.color);
    setEditingPot(pot);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!session.user) {
      logout();
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URL || "");

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.message === "new_bank_card_ready") {
        setAddBankModal(false);
        getCards();
        getBalance(bankCards.map((bank) => bank.access_token));
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onerror = (error) => {
      console.log("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return addBankModal ? (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{
          uri: plaidWebView || "",
        }}
        style={styles.webview}
      />
    </SafeAreaView>
  ) : (
    <View style={styles.mainContainer}>
      <SpendingPot
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
              onLongPress={() => {
                setSelectedBank(bank);
                setRemoveBankModal(true);
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
        <Transactions />
      </View>
      <EditPotModal
        addOrUpdatePot={addOrUpdatePot}
        deletePot={deletePot}
        editingPot={editingPot}
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

      <Modal
        isVisible={isRemoveBankModal}
        useNativeDriver={true}
        onBackdropPress={() => setRemoveBankModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Remove Bank Card</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to remove this bank card? You will lose all
            associated transactions.
          </Text>
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              onPress={() => setRemoveBankModal(false)}
              color="#888"
            />
            <Button
              title="Remove"
              onPress={async () => {
                await removeCard(
                  selectedBank?.access_token!,
                  selectedBank?.item_id!
                );
                setRemoveBankModal(false);
                setSelectedBank(null);
              }}
              color="#FF0000"
            />
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

  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});

export default HomeScreen;
