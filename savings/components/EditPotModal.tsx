import Icon from "react-native-vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
} from "react-native";
import Modal from "react-native-modal";
import { Picker } from "@react-native-picker/picker";
import { colorOptions } from "../constants/Colors";

export const EditPotModal = ({
  isModalVisible,
  editingPotIndex,
  newPotName,
  newPotAmount,
  newPotColor,
  setModalVisible,
  deletePot,
  resetModal,
  addOrUpdatePot,
  setNewPotName,
  setNewPotColor,
  setNewPotAmount,
}: {
  isModalVisible: boolean;
  editingPotIndex: number | null;
  newPotName: string;
  newPotAmount: string;
  newPotColor: string;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  deletePot: () => void;
  resetModal: () => void;
  addOrUpdatePot: () => void;
  setNewPotName: React.Dispatch<React.SetStateAction<string>>;
  setNewPotColor: React.Dispatch<React.SetStateAction<string>>;
  setNewPotAmount: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
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
              <Picker.Item key={index} label={color.name} value={color.code} />
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
              onPress={() => {
                deletePot();
                resetModal();
              }}
            >
              <Text style={styles.buttonText}>Delete Pot</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              resetModal();
              setModalVisible(false);
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
  );
};

const styles = StyleSheet.create({
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
