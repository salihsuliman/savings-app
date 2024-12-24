import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ToastAndroid,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";

const SuccessScreen = ({ navigation, route }: any) => {
  const [data, setData] = useState(null);
  const address = Platform.OS === "ios" ? "localhost" : "10.0.2.2";

  // Fetch balance data
  const getBalance = useCallback(async () => {
    await fetch(`http://${address}:8080/api/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (data == null) {
      getBalance();
    }
  }, [data]);

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.titleText}>Balance Response</Text>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.baseText}>{JSON.stringify(data)}</Text>
      </ScrollView>
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
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  baseText: {
    fontSize: 16,
    color: "#666",
  },
});

export default SuccessScreen;
