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
} from "react-native";

import {
  create,
  open,
  dismissLink,
  LinkSuccess,
  LinkExit,
  LinkIOSPresentationStyle,
  LinkLogLevel,
} from "react-native-plaid-link-sdk";

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
  "Login"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
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

  console.log("create token", `${address}/create_link_token`);

  const createLinkToken = useCallback(async () => {
    await fetch(`${address}/create_link_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: address }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("set link token", data.hosted_link_url);
        setPlaidWebView(data.hosted_link_url);
        setLinkToken(data.link_token);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [setLinkToken]);

  useEffect(() => {
    if (linkToken == null) {
      createLinkToken();
    } else {
      const tokenConfiguration = createLinkTokenConfiguration(linkToken);
      create(tokenConfiguration);
    }
  }, [linkToken]);

  const createLinkTokenConfiguration = (
    token: string,
    noLoadingState: boolean = false
  ) => {
    return {
      token: token,
      noLoadingState: noLoadingState,
    };
  };

  const createLinkOpenProps = () => {
    return {
      onSuccess: async (success: LinkSuccess) => {
        await fetch(`${address}/exchange_public_token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_token: success.publicToken }),
        })
          .catch((err) => {
            console.log(err);
          })
          .then(async () => {
            await getBalance();
          });
      },
      onExit: (linkExit: LinkExit) => {
        console.log("Exit: ", linkExit);
        dismissLink();
      },
      iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
      logLevel: LinkLogLevel.ERROR,
    };
  };

  console.log("token", linkToken);

  const handleOpenLink = () => {
    const openProps = createLinkOpenProps();
    try {
      console.log(open(openProps));
      console.log(linkToken);
      open(openProps);
    } catch (error) {
      console.log(error);
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
        },
      });
      const data = await response.json();
      console.log("returned balance", data.Balance);
      setData(data.Balance);
    } catch (err) {
      console.log(err);
      notifyMessage("Failed to fetch balance data");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    getBalance();
  }, []);

  const renderBankActivity = ({ item }: { item: any }) => (
    <View style={styles.transaction}>
      <View
        style={[
          styles.transactionIconContainer,
          { backgroundColor: item.color },
        ]}
      >
        <Text style={styles.transactionIcon}>{item.icon}</Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionTitle}>{item.name}</Text>
        <Text style={styles.transactionAmount}>
          {item.iso_currency_code} {item.amount}
        </Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {addBankModal ? (
        <>
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
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Spending pot</Text>
          <View style={styles.spendingContainer}>
            {/* Spending Pots */}
            <FlatList
              data={spendingPots}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pot,
                    { backgroundColor: item.color || "#E0E0E0" },
                  ]}
                  onPress={() =>
                    item.label === "Add pot" && setModalVisible(true)
                  }
                >
                  <Text style={styles.potIcon}>{item.icon || "+"}</Text>
                  <Text style={styles.potLabel}>{item.label}</Text>
                  {item.amount && (
                    <Text style={styles.potAmount}>{item.amount}</Text>
                  )}
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spendingPotsContainer}
            />
          </View>
          <Text style={styles.sectionTitle}>Bank activity</Text>
          <View style={styles.bankContainer}>
            {/* Bank Cards */}
            <FlatList
              data={bankCards}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => {
                    setAddBankModal(true);
                    console.log("plaidWebView", plaidWebView);
                  }}
                >
                  <Text style={styles.cardIcon}>{item.icon || "+"}</Text>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankCardsContainer}
            />
            {/* Calendar Tool */}
            <View style={styles.calendarContainer}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={styles.calendarArrow}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonth}>{formattedMonthYear}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={styles.calendarArrow}>{">"}</Text>
              </TouchableOpacity>
            </View>
            {/* Bank Activity */}
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : !data || (data && data.length === 0) ? (
              <Text style={styles.noTransactionsText}>
                No transactions available
              </Text>
            ) : (
              <FlatList
                data={data}
                keyExtractor={(item) => item.transaction_id}
                renderItem={renderBankActivity}
                contentContainerStyle={styles.bankActivityContainer}
              />
            )}
            {/* Modal for Adding a New Card */}
            <Modal visible={isModalVisible} animationType="fade" transparent>
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Add a New Card</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Card Name"
                    value={newCard}
                    onChangeText={setNewCard}
                  />
                  <Button title="Add Card" onPress={handleOpenLink} />
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                  />
                </View>
              </View>
            </Modal>
          </View>
        </>
      )}
      <View style={styles.verticallySpaced}>
        <Button
          title="Sign Out"
          onPress={async () => {
            await supabase.auth.signOut();
            navigation.navigate("Login");
          }}
        />
      </View>
    </SafeAreaView>
  );
};

function notifyMessage(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert(msg);
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6", // Match your container background
    paddingTop: Platform.OS === "android" ? 24 : 0, // Extra padding for Android devices
  },
  spendingContainer: {
    backgroundColor: "#F3F4F6",
    margin: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 12,
    marginLeft: 16,
    color: "#333",
  },
  spendingPotsContainer: {
    marginBottom: 16,
  },
  pot: {
    width: 100,
    height: 120,
    borderRadius: 12,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  potIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  potLabel: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  potAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  bankCardsContainer: {
    marginBottom: 16,
  },
  card: {
    width: 100,
    height: 120,
    borderRadius: 12,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0E0E0",
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  calendarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  calendarArrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  bankActivityContainer: {
    marginTop: 12,
    paddingBottom: 24,
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 20,
    color: "#FFF",
  },
  transactionDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E57373",
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
  },
  noTransactionsText: {
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    marginBottom: 16,
  },
  bankContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    // Optional shadow for better visual separation
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5, // for Android shadow
  },
  webview: {
    flex: 1,
    width: "100%",
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
});

export default HomeScreen;
