import Icon from "react-native-vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import Modal from "react-native-modal";
import { scaleDown } from "../utils/scaleDownPixels";
import { Pot, Transaction } from "../lib/types";
import { useAppContext } from "../context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

type SpendingPotProps = {
  logout: () => Promise<void>;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  openEditModal: (pot: Pot) => void;
};

export const SpendingPot = ({
  logout,
  setModalVisible,
  openEditModal,
}: SpendingPotProps) => {
  const addPot = require("../assets/images/add-pot.png");

  const [selectedPot, setSelectedPot] = useState<Pot | null>(null);

  const { pots, setPots, updatePotQuery } = useAppContext();

  const removeTransaction = async (pot: Pot, transaction: Transaction) => {
    const updatedPot = {
      ...pot,
      transactions: pot.transactions.filter(
        (trans) => trans.id !== transaction.id
      ),
    };

    setSelectedPot(updatedPot);

    await updatePotQuery(updatedPot);
  };

  return (
    <>
      <View style={styles.firstTitleSection}>
        <Text style={styles.title}>Spending pot</Text>
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Icon name="right-from-bracket" size={30} color={"#3629B7"} />
        </TouchableOpacity>
      </View>
      <ScrollView id="spending-pots" style={styles.spendingPot} horizontal>
        <TouchableOpacity
          style={{
            ...styles.potContainer,
          }}
          onPress={() => setModalVisible(true)}
        >
          <ImageBackground
            id="savingPot"
            style={styles.pot}
            imageStyle={{
              borderRadius: 10,
            }}
            source={addPot}
          ></ImageBackground>
        </TouchableOpacity>

        {pots.map((pot, index) => (
          <TouchableOpacity
            key={pot.id}
            style={{
              ...styles.potContainer,
            }}
            onLongPress={() => openEditModal(pot)}
            onPress={() => setSelectedPot(pot)}
          >
            <View
              key={pot.id}
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
      <Modal
        isVisible={!!selectedPot}
        useNativeDriver={true}
        onBackdropPress={() => setSelectedPot(null)}
      >
        <View style={styles.transactionModal}>
          <View>
            <Text style={styles.transactionModalTitle}>
              Transactions for {selectedPot?.label}
            </Text>
            {selectedPot?.transactions &&
              (selectedPot?.transactions).map((trans) => (
                <TouchableOpacity
                  key={trans.id}
                  id="bankCard"
                  style={styles.bankTransaction}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      width: "50%",
                    }}
                  >
                    <View
                      style={{
                        ...styles.bankTransactionIcon,
                        backgroundColor: "green",
                      }}
                    ></View>
                    <Text numberOfLines={1} style={styles.bankTransactionName}>
                      {trans.name}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        ...styles.bankTransactionAmount,
                        color: trans.amount > 0 ? "red" : "green",
                      }}
                    >{`£${trans.amount}`}</Text>
                    <Icon
                      solid
                      name="circle-xmark"
                      size={30}
                      color={"red"}
                      style={{
                        marginHorizontal: 15,
                      }}
                      onPress={() => removeTransaction(selectedPot, trans)}
                    />
                  </View>
                </TouchableOpacity>
              ))}
          </View>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              setSelectedPot(null);
            }}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
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
  transactionModal: {
    backgroundColor: "white",
    borderRadius: 15,
    minHeight: "50%",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionModalTitle: {
    fontSize: 20,
    color: "Black",
    fontWeight: 700,
    textAlign: "center",
    marginVertical: 20,
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
    borderBottomWidth: 5,
    borderBottomColor: "#d6d6d6",
  },
  button: {
    borderRadius: 5,
    padding: 10,
    margin: 5,
    alignItems: "center",
    width: "60%",
  },
  cancelButton: {
    backgroundColor: "#d9534f",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
