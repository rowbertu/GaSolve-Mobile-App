import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Cpu } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function AddDeviceScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLinkDevice = async () => {
    if (!deviceId.trim()) {
      Alert.alert("Error", "Please enter a valid Device ID.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Check if the device exists in your "Master List" in Firestore
      const deviceRef = doc(db, 'devices', deviceId.trim());
      const deviceSnap = await getDoc(deviceRef);

      if (!deviceSnap.exists()) {
        Alert.alert("Invalid ID", "This Device ID does not exist in our system.");
        setLoading(false);
        return;
      }

      // 2. Link the device to the User's UID in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        assignedDeviceId: deviceId.trim(),
        hasDevice: true
      });

      Alert.alert("Success", "Device linked successfully!");
      router.replace('/dashboard'); // Take them to see their live data

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while linking the device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Cpu color="#b91c1c" size={60} style={{ marginBottom: 20 }} />
      <Text style={styles.title}>Add Your GaSolve</Text>
      <Text style={styles.subtitle}>Enter the ID printed on the back of your MQ Sensor unit.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="e.g., GAS_01"
          placeholderTextColor="#888"
          value={deviceId}
          onChangeText={setDeviceId}
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleLinkDevice}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>LINK DEVICE</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5', padding: 30, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#b91c1c', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, fontFamily: 'Poppins_400Regular' },
  inputContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 12, height: 55, paddingHorizontal: 15, justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', marginBottom: 20 },
  input: { fontSize: 18, color: '#333', textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  button: { backgroundColor: '#b91c1c', borderRadius: 12, width: '100%', height: 55, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' }
});