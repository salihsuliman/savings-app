import Icon from "react-native-vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import Modal from "react-native-modal";
import { Picker } from "@react-native-picker/picker";
import { colorOptions } from "../constants/Colors";
import { scaleDown } from "../utils/scaleDownPixels";
import { Pot } from "../lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// based on iphone 5s's scale
const scale = SCREEN_WIDTH / 320;

type SpendingPotProps = {
  pots: Pot[];
  logout: () => Promise<void>;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  openEditModal: (index: number) => void;
};

export const SpendingPot = ({
  pots,
  logout,
  setModalVisible,
  openEditModal,
}: SpendingPotProps) => {
  const addPot = require("../assets/images/add-pot.png");

  return (
    <>
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
              onLongPress={() => openEditModal(index)}
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
                {`£${
                  parseInt(pot.amount) -
                  pot.transactions.reduce((acc, curr) => {
                    return (acc += curr.amount);
                  }, 0)
                }`}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
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
  logout: {
    backgroundColor: "white",
    height: 50,
    width: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
});
