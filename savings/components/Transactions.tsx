import Icon from "react-native-vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useAppContext } from "../context/AppContext";
import { colorOptions } from "../constants/Colors";

export const Transactions = () => {
  const {
    bankCards,
    selectedCard,
    selectAllCards,
    getBalance,
    loadingTransactions,
    transactions,
    currentMonth,
    setCurrentMonth,
  } = useAppContext();

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
      {!transactions.length ? (
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
                    key={index}
                    id="bankCard"
                    style={styles.bankTransaction}
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
                      style={styles.bankTransactionAmount}
                    >{`- £${trans.amount}`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    color: "red",
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
});
