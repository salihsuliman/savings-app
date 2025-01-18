import Icon from "react-native-vector-icons/FontAwesome6";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { useAppContext } from "../context/AppContext";
import { colorOptions } from "../constants/Colors";
import { Pot, Transaction } from "../lib/types";
import Modal from "react-native-modal";
import { scaleDown } from "../utils/scaleDownPixels";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

export const Transactions = () => {
  const {
    pots,
    setPots,
    bankCards,
    selectedCard,
    selectAllCards,
    getBalance,
    loadingTransactions,
    transactions,
    currentMonth,
    setCurrentMonth,
    updatePotQuery,
  } = useAppContext();

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [selectedPot, setSelectedPot] = useState<Pot | null>(null);

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

  const isCurrentMonth = () => {
    const today = new Date();
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth()
    );
  };

  const handleLongPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleAddToPot = async () => {
    if (!selectedPot) {
      Alert.alert("Validation Error", "Please select a pot.");
      return;
    }

    const updatedPot = {
      ...selectedPot,
      transactions: selectedTransaction
        ? [...selectedPot.transactions, selectedTransaction]
        : selectedPot.transactions,
    };

    await updatePotQuery(updatedPot);
    setModalVisible(false);
    setSelectedTransaction(null);
    setSelectedPot(null);
  };

  return (
    <>
      <View id="transaction-month" style={styles.transactionMonth}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Icon name="chevron-left" size={30} />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>{formattedMonthYear}</Text>
        {!isCurrentMonth() ? (
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Icon name="chevron-right" size={30} />
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>
      {!transactions.length && !loadingTransactions ? (
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            height: "50%",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            No transactions
          </Text>
        </View>
      ) : (
        <ScrollView
          id="transaction"
          style={styles.transactions}
          horizontal={false}
          refreshControl={
            <RefreshControl
              refreshing={loadingTransactions}
              onRefresh={() => {
                let access_tokens: string[];
                if (selectAllCards) {
                  access_tokens = bankCards.map((bank) => bank.access_token);
                  return getBalance(access_tokens);
                } else if (selectedCard) {
                  access_tokens = [selectedCard.access_token];
                  return getBalance(access_tokens);
                }
              }}
            />
          }
        >
          {loadingTransactions ? (
            <SafeAreaView style={styles.loading}>
              <View
                style={{
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" />
                <Text
                  style={{
                    marginTop: 15,
                    fontSize: 20,
                  }}
                >
                  Loading transactions
                </Text>
              </View>
            </SafeAreaView>
          ) : (
            (transactions || []).map((trans, index) => (
              <View key={index}>
                <Text style={styles.transactionDate}>{trans.date}</Text>
                {(trans.transactions || []).map((trans, index) => (
                  <TouchableOpacity
                    key={trans.id}
                    id="bankCard"
                    style={styles.bankTransaction}
                    onLongPress={() => handleLongPress(trans)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        width: "80%",
                      }}
                    >
                      <View
                        style={{
                          ...styles.bankTransactionIcon,
                          backgroundColor:
                            colorOptions[
                              Math.floor(Math.random() * colorOptions.length)
                            ].code,
                        }}
                      ></View>
                      <Text
                        numberOfLines={1}
                        style={styles.bankTransactionName}
                      >
                        {trans.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        ...styles.bankTransactionAmount,
                        color: trans.amount > 0 ? "red" : "green",
                      }}
                    >{`£${trans.amount}`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
      <Modal
        isVisible={isModalVisible}
        animationIn={"fadeIn"}
        useNativeDriver={true}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select a Pot</Text>

          <ScrollView
            id="spending-pots"
            style={styles.spendingPot}
            contentContainerStyle={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
            }}
            horizontal
          >
            {pots.map((pot, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={1}
                style={{
                  ...styles.potContainer,
                  borderWidth: 3,
                  borderRadius: 10,
                  borderColor:
                    selectedPot?.id === pot.id ? "limegreen" : "white",
                }}
                onPress={() => setSelectedPot(pot)}
              >
                <View
                  key={pot.id}
                  id="savingPot"
                  style={{
                    ...styles.pot,
                    backgroundColor: pot.color,
                  }}
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
                  {`£${
                    parseInt(pot.amount) -
                    pot.transactions.reduce((acc, curr) => {
                      return (acc += curr.amount);
                    }, 0)
                  }`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddToPot}
            >
              <Text style={styles.buttonText}>Add to Pot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loading: {
    flexDirection: "column",
    justifyContent: "center",
    marginTop: 20,
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
  bankTransactionName: {
    fontSize: 17,
    fontWeight: 600,
    width: "80%",
  },

  bankTransactionAmount: {
    fontSize: 17,
    fontWeight: 600,
  },
  bankTransactionIcon: {
    height: 50,
    width: 50,
    borderRadius: 10,
    marginRight: 15,
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
  transactionDate: {
    width: "100%",
    textAlign: "center",
    fontSize: 18,
    fontWeight: 600,
    color: "white",
    backgroundColor: "#3629B7",
    padding: 5,
  },
  calendarMonth: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
  potOption: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: "100%",
    alignItems: "center",
  },
  potOptionText: {
    fontSize: 18,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    borderRadius: 5,
    padding: 10,
    margin: 5,
    alignItems: "center",
    flex: 1,
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
});
