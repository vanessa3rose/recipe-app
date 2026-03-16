///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, use } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// initialize firebase app
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const PlanNoteModal = ({
    modalVisible, setModalVisible
}) => {
  

  ///////////////////////////////// ON OPEN /////////////////////////////////  
  
  const [isEditing, setIsEditing] = useState(false);
  const [oldNotes, setOldNotes] = useState([]);
  const [notes, setNotes] = useState([]);

  // on open
  useEffect(() => {
    if (modalVisible) {
      fetchGlobalNote();
    }
  }, [modalVisible]);

  // getting the weekly plan note from the global db
  const fetchGlobalNote = async () => {
    const planGlobal = await getDoc(doc(db, 'GLOBALS', 'plan')); 
    if (planGlobal.exists()) {
      setNotes(planGlobal.data().notes); 
    }
  }
  
  
  ///////////////////////////////// KEYBOARD /////////////////////////////////

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");

  // keyboard listener
  useEffect(() => {

    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
    });

    // listens for keyboard hide event
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardType]);


  ///////////////////////////////// CHANGING NOTES /////////////////////////////////

  const [isAdding, setIsAdding] = useState(false);
  const [addIndex, setAddIndex] = useState(0);

  // to add a note pair to the array of notes
  const addNote = () => {
    const newNote = { title: "", details: "" };

    setNotes(prev => [
      ...prev.slice(0, addIndex),   // everything before index
      newNote,                      // the new note
      ...prev.slice(addIndex)       // everything from index onward
    ]);

    setIsAdding(false);
    setAddIndex(0);
  };

  // to update the note at the given index
  const updateNote = (key, index, value) => {
    let newNotes = [...notes];
    newNotes[index][key] = value;
    setNotes(newNotes);
  }

  // to remove the note at the given index
  const deleteNote = (index) => {
    setNotes(notes.filter((_, idx) => idx !== index))
  }


  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////

  // to submit the modal
  const submitModal = async () => {
    // updates the db to match the state
    updateDoc(doc(db, 'GLOBALS', 'plan'), { notes: notes });
    
    // closes the modal
    setModalVisible(false);
  };

  
  ///////////////////////////////// HTML /////////////////////////////////
  
  const Container = isAdding ? View : ScrollView;
  return (

    // CONTAINER
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className={`flex-1 justify-center items-center ${(isKeyboardOpen && isEditing) && "mb-[200px]"}`}>
      
        {/* Background Overlay */}
        <TouchableOpacity 
          onPress={() => {!isEditing && submitModal()}} activeOpacity={isEditing && 0.5} 
          className="absolute bg-black opacity-50 w-full h-full"
        />
        
        {/* Modal Content */}
        <View className="w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">

          {/* HEADER */}
          <View className="flex-row justify-between">

            {/* Title */}
            <Text className="text-[20px] font-bold">
              NOTES
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              
              {/* editing */}
              {isEditing ? (
                <>
                  {/* Check */}
                  <Icon 
                    size={24}
                    color="black"
                    name="checkmark"
                    onPress={() => {
                      setIsEditing(false)
                      setNotes(notes.filter((note) => note.details !== ""))
                    }}
                  />

                  {/* X */}
                  <Icon 
                    size={24}
                    color="black"
                    name="close-outline"
                    onPress={() => {
                      setIsEditing(false)
                      setNotes(JSON.parse(JSON.stringify(oldNotes)))
                    }}
                  />
                </>

              // NOT EDITING
              ) : (
                <Icon
                  name="create"
                  size={24}
                  color={colors.zinc700}
                  onPress={() => {
                    setIsEditing(true)
                    setOldNotes(JSON.parse(JSON.stringify(notes)))
                  }}
                />
              )}
            </View>
          </View>
                    
          
          {/* DIVIDER */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {/* NOTE GRID */}
          <Container className={`flex flex-col max-h-[350px] ${isAdding && "mt-2 mb-6"}`}>
            {notes.map((note, index) => (
              <View key={index} className={`flex flex-col space-y-4 ${(isAdding && index) === 0 && "mt-1"} ${isAdding ? "mb-2" : "mb-4"}`}>
                    
          
                {/* DIVIDER */}
                {(index !== addIndex && ((index !== 0) || (isAdding && addIndex !== 0))) ? (
                  <View className="h-[1px] bg-zinc400 mx-2"/>

                // adding indicator
                ) : isAdding && (
                  <>
                    <View className="absolute left-0 -top-1.5">
                      <Icon name="send" color={colors.theme700} />
                    </View>
                    <View className="h-[1px] bg-zinc400 ml-4 mr-2"/>
                  </>
                )}
              
                {/* SPECIFICS */}
                <View className="flex flex-col w-full px-3 justify-center items-center">

                  {/* top row */}
                  <View className={`flex flex-row justify-between px-4  ${isAdding && "mb-2"}`}>
                    {/* Title Input */}
                    <TextInput
                      className={`w-full text-[14px] font-bold text-zinc600 ${(!isEditing || isAdding) && "text-center"}`}
                      placeholder={isEditing ? "—" : ""}
                      placeholderTextColor={colors.theme300}
                      value={note.title || ""}
                      onChangeText={(value) => updateNote("title", index, value)}
                      onFocus={() => setKeyboardType("title")}
                      onBlur={() => setKeyboardType("")}
                      editable={isEditing && !isAdding}
                    />

                    {/* Remove Button */}
                    {(isEditing && !isAdding) && (
                      <Icon
                        name="close"
                        size={20}
                        color={colors.zinc600}
                        onPress={() => deleteNote(index)}
                      />
                    )}
                  </View>

                  {/* Details Input */}
                  {!isAdding && (
                    <View className="w-full">
                      <TextInput
                        className={`w-full bg-zinc100 border-2 border-theme200 rounded-md py-1 text-[12px] ${(keyboardType === index) ? "pl-2 pr-6 min-h-[50px]" : "px-2"}`}
                        placeholder="note"
                        placeholderTextColor={colors.zinc350}
                        value={note.details || ""}
                        onChangeText={(value) => updateNote("details", index, value)}
                        multiline={true}
                        onFocus={() => setKeyboardType(index)}
                        onBlur={() => setKeyboardType("")}
                        editable={isEditing}
                      />

                      {/* Buttons When Typing */}
                      {(keyboardType === index) && (
                        <View className="absolute right-1.5 flex flex-col h-full py-1.5 justify-evenly items-center">
                          <Icon
                            name="checkmark-circle"
                            size={16}
                            color={colors.theme900}
                            onPress={() => {
                              setKeyboardType("");
                              Keyboard.dismiss();
                            }}
                          />
                          <Icon
                            name="close-circle"
                            size={16}
                            color={colors.theme900}
                            onPress={() => updateNote("details", index, "")}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* DIVIDER */}
            {(isAdding && addIndex !== notes.length) ? (
              <View className="h-[1px] bg-zinc400 mx-2"/>

            // adding indicator
            ) : isAdding && (
              <>
                <View className="absolute left-0 -bottom-1.5">
                  <Icon name="send" color={colors.theme700} />
                </View>
                <View className="h-[1px] bg-zinc400 ml-4 mr-2"/>
              </>
            )}
          </Container>


          {/* Add Note Button */}
          {isEditing && (
            <View className="flex flex-col items-center justify-center pt-4 border-t-2 border-zinc400">
              {/* + Button */}
              {!isAdding ? (
                <View className="flex justify-center items-center bg-zinc350 w-1/5 rounded-xl py-0.5 border-[1px] border-zinc400">
                  <Icon
                    name="add"
                    size={14}
                    color={colors.zinc900}
                    onPress={() => setIsAdding(true)}
                  />
                </View>

              // Choose Index
              ) : (
                <View className="flex flex-row justify-center items-center bg-theme300 px-2 space-x-2 rounded-xl py-0.5 border-[1px] border-theme400">
                  {/* picker */}
                  <View className="flex w-[50px] overflow-hidden">
                    <Picker
                      selectedValue={addIndex}
                      onValueChange={setAddIndex}
                      style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20 }}
                      itemStyle={{ color: 'black', fontWeight: '600', textAlign: 'center', fontSize: 14, }}
                    >
                      {[...notes, null].map((_, index) => (
                          <Picker.Item
                            key={index}
                            label={String(index)}
                            value={index}
                          />
                        ))
                      }
                    </Picker>
                  </View>

                  {/* submit */}
                  <Icon
                    name="checkmark-done"
                    size={20}
                    color={colors.zinc900}
                    onPress={addNote}
                  />

                  {/* cancel */}
                  <View className="absolute -right-6">
                    <Icon
                      name="close"
                      size={20}
                      color={colors.zinc900}
                      onPress={() => setIsAdding(false)}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default PlanNoteModal;