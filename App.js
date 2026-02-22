import { onValue, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { database } from './config/firebase';

const DEVICE_ID = 'esp32_lpg_001';

export default function App() {
  const [sensorData, setSensorData] = useState({
    gasLevel: 0,
    mq2Value: 0
  });
  const [mlPrediction, setMlPrediction] = useState({
    prediction: 'SAFE',
    confidence: 0
  });
  const [valveStatus, setValveStatus] = useState('open');
  const [systemStatus, setSystemStatus] = useState('safe');
  const [esp32Connected, setEsp32Connected] = useState(false);

  useEffect(() => {
    // Listen to sensor data
    const sensorRef = ref(database, `devices/${DEVICE_ID}/sensors`);
    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        setEsp32Connected(true);
      }
    });

    // Listen to ML predictions
    const mlRef = ref(database, `devices/${DEVICE_ID}/ml_prediction`);
    const unsubscribeML = onValue(mlRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMlPrediction(data);
        setSystemStatus(data.prediction === 'DANGER' ? 'danger' : 'safe');
      }
    });

    // Listen to valve status
    const valveRef = ref(database, `devices/${DEVICE_ID}/valve/status`);
    const unsubscribeValve = onValue(valveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setValveStatus(data);
      }
    });

    return () => {
      unsubscribeSensor();
      unsubscribeML();
      unsubscribeValve();
    };
  }, []);

  const toggleValve = async () => {
    if (systemStatus === 'danger') {
      Alert.alert('Warning', 'Cannot open valve during danger state!');
      return;
    }
    
    const newStatus = valveStatus === 'open' ? 'closed' : 'open';
    const valveRef = ref(database, `devices/${DEVICE_ID}/valve/status`);
    await set(valveRef, newStatus);
  };

  const getStatusColor = () => {
    return systemStatus === 'danger' ? '#ef4444' : '#10b981';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={getStatusColor()} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.title}>LPG Safety Monitor</Text>
        <Text style={styles.subtitle}>
          {esp32Connected ? '🟢 ESP32 Connected' : '🔴 Connecting...'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Emergency Alert */}
        {systemStatus === 'danger' && (
          <View style={styles.emergencyAlert}>
            <Text style={styles.emergencyIcon}>⚠️</Text>
            <Text style={styles.emergencyTitle}>GAS LEAK DETECTED</Text>
            <Text style={styles.emergencyText}>EVACUATE IMMEDIATELY</Text>
          </View>
        )}

        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusTitle}>
            {systemStatus === 'danger' ? 'DANGER - EVACUATE' : 'SYSTEM SAFE'}
          </Text>
          <Text style={styles.gasLevel}>{sensorData.gasLevel?.toFixed(1)}%</Text>
          <Text style={styles.statusLabel}>Gas Concentration Level</Text>
          <Text style={styles.mlInfo}>
            ML: {mlPrediction.prediction} ({mlPrediction.confidence?.toFixed(1)}%)
          </Text>
        </View>

        {/* Sensor Readings */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Gas Level</Text>
            <Text style={styles.gridValue}>{sensorData.gasLevel?.toFixed(1)}%</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>MQ-2 Sensor</Text>
            <Text style={styles.gridValue}>{sensorData.mq2Value}</Text>
          </View>
        </View>

        {/* Valve Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Safety Valve Control</Text>
          <Text style={styles.valveStatus}>
            Status: {valveStatus.toUpperCase()}
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              { 
                backgroundColor: valveStatus === 'open' ? '#ef4444' : '#10b981',
                opacity: systemStatus === 'danger' ? 0.5 : 1
              }
            ]}
            onPress={toggleValve}
            disabled={systemStatus === 'danger'}
          >
            <Text style={styles.buttonText}>
              {valveStatus === 'open' ? '🔒 CLOSE VALVE' : '🔓 OPEN VALVE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
          <TouchableOpacity style={styles.emergencyButton}>
            <Text style={styles.emergencyButtonText}>🚨 Emergency: 911</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyButton}>
            <Text style={styles.emergencyButtonText}>🔥 Fire: (123) 456-7890</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  emergencyAlert: {
    backgroundColor: '#ef4444',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyIcon: {
    fontSize: 60,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  emergencyText: {
    fontSize: 18,
    color: 'white',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  gasLevel: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
  },
  statusLabel: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  mlInfo: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginTop: 10,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
  },
  gridLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 5,
  },
  gridValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  valveStatus: {
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});