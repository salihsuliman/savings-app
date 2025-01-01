import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ToastAndroid,
  Platform,
  Alert,
  StyleSheet,
  FlatList,
  Button,
  ActivityIndicator,
} from "react-native";

const SuccessScreen = ({ navigation, route }: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const address = Platform.OS === "ios" ? "localhost" : "10.0.2.2";

  // Fetch balance data
  const getBalance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://${address}:8080/api/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
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
  }, [getBalance]);

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={styles.transaction}>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionName}>{item.name}</Text>
        <Text style={styles.transactionAmount}>
          {item.iso_currency_code} {item.amount}
        </Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.titleText}>Balance Response</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : data.length === 0 ? (
        <Text style={styles.noTransactionsText}>No transactions available</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.transaction_id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContainer}
        />
      )}
      <Button title="Refresh" onPress={getBalance} />
    </View>
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
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  heading: {
    marginBottom: 20,
    alignItems: "center",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  transaction: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  transactionDetails: {
    flexDirection: "column",
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  transactionAmount: {
    fontSize: 14,
    color: "#666",
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
});

export default SuccessScreen;
