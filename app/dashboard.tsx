import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router'; // Added for Logout Navigation
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth'; // Added for Logout
import { limitToLast, onValue, orderByChild, push, query, ref, remove, update } from "firebase/database";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Linking,
    LogBox,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Vibration,
    View
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dropdown } from 'react-native-element-dropdown';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import GasValveButton from "../components/gas-valve-button";

import {
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_900Black,
    useFonts
} from '@expo-google-fonts/poppins';

import { doc, getDoc, updateDoc } from 'firebase/firestore'; // <-- Add this line
import { auth, db, rtdb } from "../firebaseConfig"; // <-- Make sure 'db' is included here

LogBox.ignoreLogs(['Virtual Log', 'Text string must be rendered']);

// --- DESIGN THEME ---
const THEME = {
  background: '#FFFBF5',    
  primaryRed: '#DC2626',    
  safeGreen: '#10B981',     
  cookingOrange: '#F59E0B', 
  darkGray: '#37474F',      
  white: '#FFFFFF',
  surface: '#FFFBF5',
  editBlue: '#3B82F6', 
};

// --- NOTIFICATION CONFIG ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ==========================================
// 1. COMPONENTS
// ==========================================
const CenteredGauge = ({ value, max = 1000, colorMode }: any) => {
  const radius = 150; 
  const totalTicks = 36; 
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const activeIndex = Math.floor(percentage * totalTicks);

  const explainPPM = () => {
    Alert.alert(
        "What is PPM?",
        "PPM stands for 'Parts Per Million'. It measures how much gas is in the air.\n\n• 0-200: Clean Air (Safe)\n• 200-1000: Minor Gas (Cooking)\n• 1000+: Leak Warning",
        [{ text: "Got it" }]
    );
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: radius + 80, marginTop: 0, marginBottom: 10 }}>
      <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center', top: radius / 1.8 }}>
        {Array.from({ length: totalTicks + 1 }).map((_, i) => {
          const rotate = -100 + (i * (200 / totalTicks));
          const isActive = i <= activeIndex;
          const color = isActive ? colorMode : '#E0E0E0'; 

          return (
            <View key={i} style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'flex-start', alignItems: 'center',
                transform: [{ rotate: `${rotate}deg` }],
              }}>
              <View style={{ width: 7, height: 18, backgroundColor: color, borderRadius: 3 }} />
            </View>
          );
        })}
      </View>

      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems:'center', justifyContent:'center', paddingTop: 50 }}>
         <Text style={{ fontSize: 54, fontFamily: 'Poppins_900Black', color: colorMode, lineHeight: 60, textAlign: 'center' }}>
            {value.toFixed(0)}
         </Text>
         
         <TouchableOpacity onPress={explainPPM} style={{flexDirection:'row', alignItems:'center', marginTop: 0}}>
             <Text style={{ fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#999' }}>PPM LEVEL</Text>
             <Feather name="help-circle" size={15} color="#999" style={{marginLeft: 4}} />
         </TouchableOpacity>
      </View>
    </View>
  );
};

const SafetyInstructions = () => (
    <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
            <Ionicons name="warning" size={28} color="white" />
            <Text style={styles.safetyHeaderText}>SAFETY INSTRUCTIONS</Text>
        </View>
        <View style={styles.safetyList}>
            <View style={[styles.safetyItem, {borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:15}]}>
                <MaterialCommunityIcons name="valve-closed" size={32} color={THEME.primaryRed} />
                <View style={{marginLeft: 15, flex:1}}>
                    <Text style={styles.safetyItemTitle}>VALVE CLOSED</Text>
                    <Text style={styles.safetyItemDesc}>Valve closed automatically for safety.</Text>
                </View>
            </View>
            <View style={styles.safetyItem}>
                <MaterialCommunityIcons name="window-open" size={32} color={THEME.primaryRed} />
                <View style={{marginLeft: 15, flex:1}}>
                    <Text style={styles.safetyItemTitle}>VENTILATE NOW</Text>
                    <Text style={styles.safetyItemDesc}>Open all windows and doors immediately.</Text>
                </View>
            </View>
            <View style={styles.safetyItem}>
                <MaterialCommunityIcons name="light-switch-off" size={32} color={THEME.primaryRed} />
                <View style={{marginLeft: 15, flex:1}}>
                    <Text style={styles.safetyItemTitle}>NO SPARKS</Text>
                    <Text style={styles.safetyItemDesc}>DO NOT touch light switches or appliances.</Text>
                </View>
            </View>
            <View style={styles.safetyItem}>
                <MaterialCommunityIcons name="run-fast" size={32} color={THEME.primaryRed} />
                <View style={{marginLeft: 15, flex:1}}>
                    <Text style={styles.safetyItemTitle}>EVACUATE</Text>
                    <Text style={styles.safetyItemDesc}>Move everyone outside to fresh air immediately.</Text>
                </View>
            </View>
        </View>
    </View>
);

// ==========================================
// 2. HELPERS
// ==========================================
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default', importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C',
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
    trigger: null,
  });
}

const SimpleHeader = () => (
  <View style={styles.headerContainer}>
    <View style={{alignItems:'center', justifyContent:'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image source={require('../assets/images/RED_LOGO.png')} style={{width: 130, height: 80, resizeMode:'contain'}} />
        </View>
    </View>
  </View>
);

const DashboardDateHeader = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -30, paddingHorizontal: 5, zIndex: 10 }}>
         <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
             <Text style={{fontFamily: 'Poppins_700Bold', color: THEME.darkGray, fontSize: 24, lineHeight: 28}}>{timeStr}</Text>
             <Text style={{fontFamily: 'Poppins_600SemiBold', color: '#999', fontSize: 12}}>{dateStr}</Text>
         </View>
         <View style={{ backgroundColor: 'white', borderColor: THEME.primaryRed, borderWidth: 1.5, paddingHorizontal:12, paddingVertical:4, borderRadius:20, flexDirection:'row', alignItems:'center' }}>
             <Text style={{color: THEME.primaryRed, fontSize:12, fontFamily:'Poppins_700Bold'}}>LIVE</Text>
             <View style={{width:8, height:8, borderRadius:4, backgroundColor:THEME.primaryRed, marginLeft:6}} />
         </View>
    </View>
  );
};

// ==========================================
// 3. SCREENS
// ==========================================
function HomeScreen() {
  const [gasLevel, setGasLevel] = useState(0);
  const [weight, setWeight] = useState(0);
  const [valveOpen, setValveOpen] = useState(true);
  const [systemStatus, setSystemStatus] = useState("");
  const [threshold, setThreshold] = useState(1000); 
  
  const isAlertActive = useRef(false);
  const wasInEmergency = useRef(false);
  const soundObject = useRef(new Audio.Sound());
  
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
        });
      } catch (e) { console.log("Audio Setup Error:", e); }
    }
    setupAudio();
  }, []);

  useEffect(() => {
    const refs = {
      gas: ref(rtdb, "Home_01/Live_Status/Gas_PPM"),
      weight: ref(rtdb, "Home_01/Live_Status/Weight_KG"),
      valve: ref(rtdb, "Home_01/Live_Status/Valve_State"),
      statusText: ref(rtdb, "Home_01/Live_Status/Status"),
      limit: ref(rtdb, "Home_01/Live_Status/Settings/Threshold") 
    };
    onValue(refs.gas, (s) => s.exists() && setGasLevel(Number(s.val())));
    onValue(refs.weight, (s) => s.exists() && setWeight(Number(s.val())));
    onValue(refs.valve, (s) => s.exists() && setValveOpen(s.val() === 1 || s.val() === true));
    onValue(refs.statusText, (s) => s.exists() && setSystemStatus(s.val()));
    onValue(refs.limit, (s) => s.exists() && setThreshold(Number(s.val())));
  }, []);

  useEffect(() => {
    const checkSafety = async () => {
      const statusRef = ref(rtdb, "Home_01/Live_Status");

      // --- 1. DANGER ZONE ---
      if (gasLevel >= threshold) {
        wasInEmergency.current = true;
        
        update(statusRef, {
          Valve_State: 0,
          Status: "⚠️ High gas levels detected. Follow the safety instructions immediately."
        });
        
        if (!isAlertActive.current) {
          isAlertActive.current = true;
          await playSiren();
          const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM format
          push(ref(rtdb, `Home_01/History/${monthKey}`), {
            event: "⚠️ GAS LEAK DETECTED",
            timestamp: Date.now(),
            details: `Gas level reached ${gasLevel} PPM.`
          });
        }
      } 
      // --- 2. SAFE ZONE ---
      else if (gasLevel < (threshold - 100)) {
        
        if (wasInEmergency.current) {
          update(statusRef, {
            Valve_State: 1,
            Status: "🔄 Gas Restored: Reopening Valve"
          });
          wasInEmergency.current = false;
        } else {
          update(statusRef, {
            Status: "✅ No leaks detected. Environment is secure."
          });
        }

        if (isAlertActive.current) {
          isAlertActive.current = false;
          await stopSiren();
        }
      }
      // --- 3. COOKING ZONE ---
      else {
        update(statusRef, {
          Valve_State: 1,
          Status: "🔥 Gas is being used. Levels are elevated but within normal range."
        });
      }
    };

    checkSafety();
  }, [gasLevel, threshold]); 

  async function playSiren() {
    try {
      const status = await soundObject.current.getStatusAsync();
      if (!status.isLoaded) {
          await soundObject.current.loadAsync(
              { uri: 'https://cdn.pixabay.com/audio/2022/10/16/audio_a15f013bd8.mp3' }, 
              { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
      } else {
          await soundObject.current.playAsync();
      }
      Vibration.vibrate([0, 500, 500], true); 
    } catch (error) { console.log("Play Error:", error); }
  }

  async function stopSiren() {
    try {
        const status = await soundObject.current.getStatusAsync();
        if (status.isLoaded) {
            await soundObject.current.stopAsync();
            await soundObject.current.unloadAsync();
        }
        Vibration.cancel();
    } catch (error) { console.log("Stop Error:", error); }
  }

 let mode = "SAFE"; 
  let primaryColor = THEME.safeGreen;
  let statusTitle = "SAFE";
  let statusDesc = systemStatus || "No leaks detected. Environment is secure."; 

  let statusIcon: any = valveOpen ? "shield-check" : "lock";

  if (gasLevel >= threshold) {
      mode = "WARNING"; 
      primaryColor = THEME.primaryRed; 
      statusTitle = "WARNING"; 
      statusDesc = systemStatus || "High gas levels detected. Valve closed immediately."; 
      statusIcon = "alert-octagon";
  } else if (gasLevel >= 250) {
      mode = "COOKING"; 
      primaryColor = THEME.cookingOrange; 
      statusTitle = "IN USE"; 
      statusDesc = "Gas is being used. Levels are elevated but within normal range."; 
      statusIcon = "fire";
  }
  
 const toggleValve = () => {
    if (gasLevel >= threshold) {
      Alert.alert("Safety Lock", "Cannot open valve during a gas leak!");
      return;
    }

    const actionWord = valveOpen ? "CLOSE" : "OPEN";

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${actionWord} the gas valve?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, I'm sure",
          style: valveOpen ? "destructive" : "default",
          onPress: () => {
            // 3. FIREBASE UPDATE (Runs only if they confirm)
            const newState = valveOpen ? 0 : 1;
            update(ref(rtdb, "Home_01/Live_Status"), {
              Valve_State: newState,
              Status: newState === 1 ? "Valve Opened." : "Valve manually closed."
            });

            // 4. LOG TO HISTORY BY MONTH
            const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM format
            const historyRef = ref(rtdb, `Home_01/History/${monthKey}`);
            const eventMsg = newState === 1 ? "🔓 VALVE OPENED MANUALLY" : "🔒 VALVE CLOSED MANUALLY";
            const details = newState === 1 ? `Valve restored. Gas level at ${gasLevel} PPM.` : `Valve closed by user. Gas level at ${gasLevel} PPM.`;
            
            push(historyRef, {
              event: eventMsg,
              timestamp: Date.now(),
              details: details
            });

            // 5. RESET EMERGENCY STATE IF OPENING
            if (newState === 1) {
              wasInEmergency.current = false;
            }
          }
        },
      ],
      { cancelable: true }
    );
  };

  const weightPercent = Math.min(Math.max((weight / 11) * 100, 0), 100);

  return (
    <View style={styles.screenContainer}>
      <SimpleHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <DashboardDateHeader />
        <CenteredGauge value={gasLevel} max={threshold} colorMode={primaryColor} />

        <View style={[styles.statusBanner, { backgroundColor: primaryColor }]}>
            <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center'}}>
                <MaterialCommunityIcons name={statusIcon} size={32} color="white" />
                <Text style={styles.statusBannerTitle}>{statusTitle}</Text>
            </View>
            <Text style={styles.statusBannerDesc}>{statusDesc}</Text>
            {mode !== "SAFE" && (
                <View style={styles.trendTag}>
                    <Feather name="trending-up" size={16} color={primaryColor} />
                    <Text style={{color: primaryColor, fontWeight:'bold', marginLeft:5}}>GAS RISING TREND</Text>
                </View>
            )}
        </View>

        {mode === "WARNING" ? (
            <View style={{marginTop: 20}}>
                <SafetyInstructions />
                <TouchableOpacity style={styles.emergencyBtnLarge} onPress={() => Linking.openURL('tel:911')}>
                    <Text style={styles.emergencyBtnText}>CALL EMERGENCY (911)</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <View style={{marginTop: 20}}>
                <GasValveButton valveOpen={valveOpen} onToggle={toggleValve} />

                <View style={styles.controlCard}>
                    <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                        <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}>
                            <MaterialCommunityIcons name="gas-cylinder" size={24} color={THEME.cookingOrange} />
                        </View>
                        <View style={{marginLeft: 15, flex: 1}}>
                            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                                <Text style={styles.cardLabel}>Tank Level</Text>
                                <Text style={{fontWeight:'bold', color: THEME.primaryRed}}>{weight.toFixed(1)} kg</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, {width: `${weightPercent}%`}]} />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        )}
      </ScrollView>
    </View>
  );
}

function HistoryScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('daily');
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);

  const loadSimulatedData = () => {
    if (timeframe === 'daily') {
        setChartLabels(["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"]);
        setChartData([50, 150, 600, 1200, 450, 80]);
    } else {
        setChartLabels(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
        setChartData([120, 180, 550, 1300, 400, 90, 60]);
    }
  };

  useEffect(() => {
    loadSimulatedData();
    const monthKey = new Date().toISOString().slice(0, 7); // Current month YYYY-MM
    const historyRef = ref(rtdb, `Home_01/History/${monthKey}`);
    const q = query(historyRef, orderByChild('timestamp'), limitToLast(50));
    onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLogs(Object.keys(data).map(k => ({id:k, ...data[k]})).sort((a,b)=>b.timestamp - a.timestamp));
      } else {
        setLogs([]);
      }
    });
  }, [timeframe]);

  const renderHeader = () => {
    return (
     <View style={{ marginBottom: 20 }}>
        <Text style={styles.screenTitle}>ANALYTICS</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, timeframe === 'daily' && styles.tabActive]} onPress={() => setTimeframe('daily')}>
            <Text style={[styles.tabText, timeframe === 'daily' && styles.tabTextActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, timeframe === 'weekly' && styles.tabActive]} onPress={() => setTimeframe('weekly')}>
            <Text style={[styles.tabText, timeframe === 'weekly' && styles.tabTextActive]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 16, paddingBottom: 10, elevation: 4, shadowColor: THEME.primaryRed, shadowOpacity: 0.1 }}>
         {chartData.length > 0 && chartLabels.length > 0 && (
        <LineChart
          data={{
            labels: chartLabels,
            datasets: [
              { data: chartData, color: (opacity = 1) => `rgba(55, 71, 79, ${opacity})`, strokeWidth: 4, withDots: true },
              { data: new Array(chartLabels.length).fill(1000), color: () => THEME.primaryRed, strokeWidth: 2, withDots: false, strokeDashArray: [10, 5] },
              { data: new Array(chartLabels.length).fill(250), color: () => THEME.cookingOrange, strokeWidth: 2, withDots: false, strokeDashArray: [10, 5] },
              { data: new Array(chartLabels.length).fill(100), color: () => THEME.safeGreen, strokeWidth: 2, withDots: false, strokeDashArray: [10, 5] }
            ]
          }}
          width={Dimensions.get("window").width - 40} height={240} fromZero
          chartConfig={{
            backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, labelColor: () => THEME.darkGray,
            fillShadowGradientFrom: "white", fillShadowGradientTo: "white", fillShadowGradientOpacity: 0,
            propsForBackgroundLines: { strokeDasharray: "", stroke: "#F5F5F5" }
          }}
          bezier style={{ borderRadius: 16, marginTop: 10 }}
        />
      )}
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: THEME.safeGreen }]} /><Text style={styles.legendText}>Safe</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: THEME.cookingOrange }]} /><Text style={styles.legendText}>In Use</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: THEME.primaryRed }]} /><Text style={styles.legendText}>Warning</Text></View>
            </View>
        </View>
        <Text style={styles.sectionHeader}>RECENT ACTIVITY</Text>
     </View>
    );
  };

  return (
    <View style={styles.screenContainer}>
        <SimpleHeader />
        <FlatList
            data={logs.slice(0, 5)} // This cuts the list down to just the first 3 items
            keyExtractor={i => i.id} ListHeaderComponent={renderHeader} contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
                <View style={styles.logItem}>
                    <Text style={{ fontFamily: 'Poppins_700Bold', color: THEME.darkGray }}>{item.event}</Text>
                    {item.details && (
                      <Text style={{ fontSize: 12, color: THEME.darkGray, marginTop: 4 }}>
                        {item.details}
                      </Text>
                    )}
                    <Text style={{ fontSize: 12, color: THEME.primaryRed, marginTop: 4 }}>
                      {timeframe === 'daily' 
                        ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                      }
                    </Text>
                </View>
            )}
        />
    </View>
  );
}

function EmergencyScreen() {
    const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState(null);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRole, setNewRole] = useState(''); 
    const [isCustomRole, setIsCustomRole] = useState(true);
    const [errors, setErrors] = useState({ name: false, phone: false, role: false });
  
    useEffect(() => {
      const membersRef = ref(rtdb, "Home_01/Household_Members");
      onValue(membersRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setHouseholdMembers(Object.keys(data).map(key => ({ id: key, ...data[key] })));
        } else { setHouseholdMembers([]); }
      });
    }, []);
  
    const handleSaveMember = () => {
      let currentErrors = { name: false, phone: false, role: false };
      let hasError = false;

      if (!newName.trim()) { currentErrors.name = true; hasError = true; }
      if (!newPhone.trim() || newPhone.length !== 11) { currentErrors.phone = true; hasError = true; }
      if (!newRole.trim()) { currentErrors.role = true; hasError = true; }

      setErrors(currentErrors);
      if (hasError) { Vibration.vibrate(); return; }
      
      if (editingMemberId) {
        update(ref(rtdb, `Home_01/Household_Members/${editingMemberId}`), { name: newName, phone: newPhone, role: newRole }).then(() => { closeAndResetModal(); });
      } else {
        push(ref(rtdb, "Home_01/Household_Members"), { name: newName, phone: newPhone, role: newRole }).then(() => { closeAndResetModal(); });
      }
    };

    const handleDeleteMember = (id: string) => {
        Alert.alert("Delete Contact", "Are you sure you want to delete this contact?", [
            { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove(ref(rtdb, `Home_01/Household_Members/${id}`)) }
        ]);
    };

    const openAddModal = () => { setEditingMemberId(null); setNewName(''); setNewPhone(''); setNewRole(''); setErrors({ name: false, phone: false, role: false }); setAddModalVisible(true); };
    const openEditModal = (member: any) => { setEditingMemberId(member.id); setNewName(member.name); setNewPhone(member.phone); setNewRole(member.role); setErrors({ name: false, phone: false, role: false }); setAddModalVisible(true); };
    const closeAndResetModal = () => { setAddModalVisible(false); setEditingMemberId(null); setNewName(''); setNewPhone(''); setNewRole(''); setErrors({ name: false, phone: false, role: false }); };

    const renderRightActions = (id: string) => (
        <TouchableOpacity onPress={() => handleDeleteMember(id)} style={styles.deleteAction}>
            <Feather name="trash-2" size={24} color="white" />
            <Text style={{color:'white', fontWeight:'bold', fontSize: 10}}>Delete</Text>
        </TouchableOpacity>
    );

    const renderLeftActions = (member: any) => (
        <TouchableOpacity onPress={() => openEditModal(member)} style={styles.editAction}>
            <Feather name="edit" size={24} color="white" />
            <Text style={{color:'white', fontWeight:'bold', fontSize: 10}}>Edit</Text>
        </TouchableOpacity>
    );
  
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <View style={styles.screenContainer}>
                <SimpleHeader />
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <Text style={styles.screenTitle}>CONTACTS</Text>
                    <TouchableOpacity style={styles.emergencyCardRed} onPress={() => Linking.openURL('tel:911')}>
                        <Ionicons name="call" size={32} color="white" />
                        <View style={{marginLeft: 15}}>
                            <Text style={{color:'white', fontSize:20, fontFamily:'Poppins_700Bold'}}>Call 911 / BFP</Text>
                            <Text style={{color:'white', fontSize:12}}>Emergency Hotline</Text>
                        </View>
                    </TouchableOpacity>
        
                    <Text style={styles.sectionHeader}>HOUSEHOLD MEMBERS</Text>
                    <Text style={{fontSize: 10, color: '#999', marginBottom: 10, textAlign:'center'}}>Slide Right to Edit  •  Slide Left to Delete</Text>

                    {householdMembers.map((member) => (
                        <Swipeable key={member.id} renderRightActions={() => renderRightActions(member.id)} renderLeftActions={() => renderLeftActions(member)}>
                            <View style={styles.contactRow}>
                                <View style={styles.avatarCircle}><Text style={{color:'white', fontWeight:'bold'}}>{member.name.charAt(0)}</Text></View>
                                <View style={{flex: 1, marginLeft: 15}}>
                                    <Text style={styles.contactName}>{member.name}</Text>
                                    <Text style={styles.contactRole}>{member.role} • {member.phone}</Text>
                                </View>
                                <TouchableOpacity style={styles.callIconBtn} onPress={() => Linking.openURL(`tel:${member.phone}`)}>
                                    <Feather name="phone" size={20} color={THEME.primaryRed} />
                                </TouchableOpacity>
                            </View>
                        </Swipeable>
                    ))}
                    <TouchableOpacity style={styles.addMemberBtn} onPress={openAddModal}>
                        <Feather name="plus" size={18} color="white" />
                        <Text style={{color:'white', fontFamily:'Poppins_700Bold', marginLeft:8}}>Add Member</Text>
                    </TouchableOpacity>
                </ScrollView>
        
                <Modal visible={isAddModalVisible} animationType="slide" transparent={true}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.addMemberModalContent}>
                            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                                <Text style={styles.modalTitle}>{editingMemberId ? "Edit Contact" : "Add Contact"}</Text>
                                <TouchableOpacity onPress={closeAndResetModal}><Feather name="x" size={24} color={THEME.darkGray} /></TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Full Name <Text style={{color:'red'}}>*</Text></Text>
                            <TextInput style={[styles.textInput, errors.name && styles.errorBorder]} value={newName} onChangeText={(t) => {setNewName(t); if(t) setErrors({...errors, name:false})}} placeholder="e.g. Juan Dela Cruz" />
                            {errors.name && <Text style={styles.errorText}>Name is required</Text>}

                            <Text style={[styles.label, {marginTop:10}]}>Phone Number <Text style={{color:'red'}}>*</Text></Text>
                            <TextInput style={[styles.textInput, errors.phone && styles.errorBorder]} value={newPhone} onChangeText={(t) => {setNewPhone(t); if(t) setErrors({...errors, phone:false})}} keyboardType="number-pad" maxLength={11} placeholder="09xxxxxxxxx" />
                            {errors.phone && <Text style={styles.errorText}>{newPhone.length > 0 && newPhone.length !== 11 ? "Input a valid phone number" : "Phone is required"}</Text>}

                            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:15, marginBottom:5}}>
                                <Text style={styles.label}>Role <Text style={{color:'red'}}>*</Text></Text>
                                <TouchableOpacity onPress={() => setIsCustomRole(!isCustomRole)}><Text style={{color:THEME.primaryRed, fontSize:12}}>{isCustomRole ? "Switch to List" : "Switch to Custom"}</Text></TouchableOpacity>
                            </View>
                            
                            {isCustomRole ? (
                                <TextInput style={[styles.textInput, errors.role && styles.errorBorder]} value={newRole} onChangeText={(t) => {setNewRole(t); if(t) setErrors({...errors, role:false})}} placeholder="e.g. Neighbor" />
                            ) : (
                                <Dropdown style={[styles.dropdown, errors.role && styles.errorBorder]} data={[{label:'Parent', value:'Parent'}, {label:'Sibling', value:'Sibling'}, {label:'Others', value:'Others'}]} labelField="label" valueField="value" placeholder="Select Role" value={newRole} onChange={item => {setNewRole(item.value); setErrors({...errors, role:false})}} />
                            )}
                            {errors.role && <Text style={styles.errorText}>Role is required</Text>}

                            <TouchableOpacity style={styles.continueBtn} onPress={handleSaveMember}>
                                <Text style={{color:'white', fontFamily:'Poppins_700Bold'}}>SAVE</Text>
                            </TouchableOpacity>

                            {/* Subtle Cancel Button */}
                            <TouchableOpacity 
                                style={{
                                    backgroundColor: '#F5F5F5', 
                                    padding: 15, 
                                    borderRadius: 10, 
                                    alignItems: 'center', 
                                    marginTop: 10, 
                                    borderWidth: 1, 
                                    borderColor: '#E0E0E0'
                                }} 
                                onPress={closeAndResetModal}
                            >
                                <Text style={{fontSize: 15, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}

function SettingsScreen() {
    const router = useRouter(); 
    
    // State to hold the fetched name - defaults to "User" while loading
    const [userName, setUserName] = useState("User");
    const [isProfileModalVisible, setProfileModalVisible] = useState(false);
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [isAboutModalVisible, setAboutModalVisible] = useState(false);
    const [aboutTab, setAboutTab] = useState('about');
    const [editName, setEditName] = useState('');
    const [editError, setEditError] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordErrors, setPasswordErrors] = useState({ current: false, new: false, confirm: false });
    const currentUserEmail = auth.currentUser?.email || "user@gasolve.com";

    // Fetch the user's name from Firestore
    useEffect(() => {
        const fetchUserData = async () => {
            if (auth.currentUser) {
                try {
                    const userDocRef = doc(db, "users", auth.currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        setUserName(userDocSnap.data().fullName);
                    } else {
                        setUserName("Unknown User");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserName("Error loading name");
                }
            }
        };
        
        fetchUserData();
    }, []);

    const openProfileModal = () => {
        setEditName(userName !== "User" ? userName : "");
        setEditError(false);
        setProfileModalVisible(true);
    };

    const openPasswordModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({ current: false, new: false, confirm: false });
        setPasswordModalVisible(true);
    };

    const handleChangePassword = async () => {
        let errors = { current: false, new: false, confirm: false };
        let hasError = false;

        if (!currentPassword.trim()) { errors.current = true; hasError = true; }
        if (!newPassword.trim() || newPassword.length < 6) { errors.new = true; hasError = true; }
        if (!confirmPassword.trim() || confirmPassword !== newPassword) { errors.confirm = true; hasError = true; }

        setPasswordErrors(errors);
        if (hasError) { Vibration.vibrate(); return; }

        try {
            if (auth.currentUser && auth.currentUser.email) {
                const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);
                await updatePassword(auth.currentUser, newPassword);
                setPasswordModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                Alert.alert("Success", "Password changed successfully!");
            }
        } catch (error: any) {
            console.error("Error changing password:", error);
            if (error.code === 'auth/wrong-password') {
                Alert.alert("Error", "Current password is incorrect.");
            } else if (error.code === 'auth/weak-password') {
                Alert.alert("Error", "Password is too weak. Please use at least 6 characters.");
            } else {
                Alert.alert("Error", "Failed to change password. Please try again.");
            }
        }
    };

    const handleSaveName = async () => {
        if (!editName.trim()) {
            setEditError(true);
            Vibration.vibrate();
            return;
        }

        try {
            if (auth.currentUser) {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userDocRef, { fullName: editName });
                setUserName(editName);
                setProfileModalVisible(false);
                setEditError(false);
                Alert.alert("Success", "Profile updated successfully!");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile. Please try again.");
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out of GaSolve?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            router.replace('/'); 
                        } catch (error) {
                            Alert.alert("Error", "Failed to log out. Please try again.");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <View style={styles.screenContainer}>
            <SimpleHeader />
            <ScrollView contentContainerStyle={{padding: 24, paddingBottom: 100}}>
                <Text style={styles.screenTitle}>SETTINGS</Text>
                
                <TouchableOpacity onPress={openProfileModal} style={{flexDirection:'row', alignItems:'center', marginBottom:20}}>
                    <Ionicons name="person-circle" size={100} color={THEME.primaryRed} />
                    <View style={{marginLeft:10, flex:1}}>
                        <Text style={{fontSize:20, fontFamily:'Poppins_700Bold', color: THEME.primaryRed}}>
                            {userName}
                        </Text>
                        <Text style={{fontSize:13, fontFamily:'Poppins_600SemiBold', color:THEME.darkGray}}>
                            {currentUserEmail}
                        </Text>
                        <View style={{flexDirection:'row', alignItems:'center', marginTop:8}}>
                            <Feather name="edit-2" size={14} color={THEME.primaryRed} />
                            <Text style={{fontSize:12, color:THEME.primaryRed, fontFamily:'Poppins_600SemiBold', marginLeft:4}}>Edit Profile</Text>
                        </View>
                    </View>   
                </TouchableOpacity>

                {/* Subtle Change Password Button */}
                <TouchableOpacity 
                    style={{
                        backgroundColor: '#F5F5F5', 
                        padding: 15, 
                        borderRadius: 10, 
                        alignItems: 'center', 
                        marginTop: 20, 
                        borderWidth: 1,
                        borderColor: '#E0E0E0'
                    }} 
                    onPress={openPasswordModal}
                >
                    <Text style={{fontSize: 15, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>Change Password</Text>
                </TouchableOpacity>

                {/* Subtle About GaSolve Button */}
                <TouchableOpacity 
                    style={{
                        backgroundColor: '#F5F5F5', 
                        padding: 15, 
                        borderRadius: 10, 
                        alignItems: 'center', 
                        marginTop: 12, 
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#E0E0E0'
                    }} 
                    onPress={() => setAboutModalVisible(true)}
                >
                    <Text style={{fontSize: 15, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>About GaSolve</Text>
                </TouchableOpacity>

                {/* Primary Red Log Out Button */}
                <TouchableOpacity style={styles.logoutBtnNew} onPress={handleLogout}>
                    <Text style={{fontSize: 15, color: 'white', fontFamily: 'Poppins_700Bold', fontWeight: 'bold'}}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Profile Modal */}
            <Modal visible={isProfileModalVisible} animationType="slide" transparent={true}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <View style={styles.addMemberModalContent}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}><Feather name="x" size={24} color={THEME.darkGray} /></TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Full Name <Text style={{color:'red'}}>*</Text></Text>
                        <TextInput 
                            style={[styles.textInput, editError && styles.errorBorder]} 
                            value={editName} 
                            onChangeText={(t) => {setEditName(t); if(t) setEditError(false);}} 
                            placeholder="Enter your full name" 
                        />
                        {editError && <Text style={styles.errorText}>Name is required</Text>}

                        <TouchableOpacity style={styles.continueBtn} onPress={handleSaveName}>
                            <Text style={{color:'white', fontFamily:'Poppins_700Bold'}}>SAVE</Text>
                        </TouchableOpacity>

                        {/* Subtle Cancel Button */}
                        <TouchableOpacity 
                            style={{
                                backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', 
                                marginTop: 10, borderWidth: 1, borderColor: '#E0E0E0'
                            }} 
                            onPress={() => setProfileModalVisible(false)}
                        >
                            <Text style={{fontSize: 15, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Password Modal */}
            <Modal visible={isPasswordModalVisible} animationType="slide" transparent={true}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <View style={styles.addMemberModalContent}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}><Feather name="x" size={24} color={THEME.darkGray} /></TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Current Password <Text style={{color:'red'}}>*</Text></Text>
                        <TextInput 
                            style={[styles.textInput, passwordErrors.current && styles.errorBorder]} 
                            value={currentPassword} 
                            onChangeText={(t) => {setCurrentPassword(t); if(t) setPasswordErrors({...passwordErrors, current:false});}} 
                            placeholder="Enter current password"
                            secureTextEntry
                        />
                        {passwordErrors.current && <Text style={styles.errorText}>Current password is required</Text>}

                        <Text style={[styles.label, {marginTop:10}]}>New Password <Text style={{color:'red'}}>*</Text></Text>
                        <TextInput 
                            style={[styles.textInput, passwordErrors.new && styles.errorBorder]} 
                            value={newPassword} 
                            onChangeText={(t) => {setNewPassword(t); if(t && t.length >= 6) setPasswordErrors({...passwordErrors, new:false});}} 
                            placeholder="Enter new password (min 6 characters)"
                            secureTextEntry
                        />
                        {passwordErrors.new && <Text style={styles.errorText}>{newPassword.length > 0 && newPassword.length < 6 ? "Password must be at least 6 characters" : "New password is required"}</Text>}

                        <Text style={[styles.label, {marginTop:10}]}>Confirm Password <Text style={{color:'red'}}>*</Text></Text>
                        <TextInput 
                            style={[styles.textInput, passwordErrors.confirm && styles.errorBorder]} 
                            value={confirmPassword} 
                            onChangeText={(t) => {setConfirmPassword(t); if(t && t === newPassword) setPasswordErrors({...passwordErrors, confirm:false});}} 
                            placeholder="Confirm new password"
                            secureTextEntry
                        />
                        {passwordErrors.confirm && <Text style={styles.errorText}>{confirmPassword.length > 0 && confirmPassword !== newPassword ? "Passwords do not match" : "Please confirm password"}</Text>}

                        <TouchableOpacity style={styles.continueBtn} onPress={handleChangePassword}>
                            <Text style={{color:'white', fontFamily:'Poppins_700Bold'}}>CHANGE PASSWORD</Text>
                        </TouchableOpacity>

                        {/* Subtle Cancel Button */}
                        <TouchableOpacity 
                            style={{
                                backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', 
                                marginTop: 10, borderWidth: 1, borderColor: '#E0E0E0'
                            }} 
                            onPress={() => setPasswordModalVisible(false)}
                        >
                            <Text style={{fontSize: 15, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* About Modal */}
            {/* About Modal */}
            <Modal visible={isAboutModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.addMemberModalContent, {height: '88%', flexDirection: 'column'}]}>
                        {/* Header */}
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                            <Text style={styles.modalTitle}>About GaSolve</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                                <Feather name="x" size={24} color={THEME.darkGray} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}>
                            
                            {/* --- ABOUT SECTION --- */}
                            <View style={{alignItems: 'center', marginBottom: 20}}>
                                <Image source={require('../assets/images/RED_LOGO.png')} style={{width: 70, height: 54, resizeMode:'contain'}} />
                                <Text style={{fontSize: 22, fontFamily: 'Poppins_700Bold', color: THEME.primaryRed, marginTop: 5}}>GaSolve</Text>
                                <Text style={{fontSize: 12, color: '#999', fontFamily: 'Poppins_600SemiBold'}}>Version 1.0.0</Text>
                            </View>

                            <View style={{backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 15}}>
                                <Text style={{fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 8}}>What is GaSolve?</Text>
                                <Text style={{fontSize: 12, color: '#555', lineHeight: 18, fontFamily: 'Poppins_400Regular'}}>
                                    GaSolve is a smart LPG safety monitoring system designed to protect your home and loved ones from gas leaks. Our app provides real-time gas level monitoring, automatic valve control, and instant alerts.
                                </Text>
                            </View>

                            <View style={{backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: THEME.primaryRed, marginBottom: 30}}>
                                <Text style={{fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.primaryRed, marginBottom: 6}}>Emergency Support</Text>
                                <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>Call 911 / BFP for emergencies</Text>
                            </View>


                            {/* --- FEATURES SECTION --- */}
                            <Text style={{fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 12}}>Key Features</Text>
                            
                            <View style={{backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: THEME.primaryRed, marginBottom: 15}}>
                                <View style={{marginBottom: 10}}>
                                    <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>📊 Real-time PPM monitoring</Text>
                                </View>
                                <View style={{marginBottom: 10}}>
                                    <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>🚨 Automatic safety alerts</Text>
                                </View>
                                <View style={{marginBottom: 10}}>
                                    <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>🔒 Valve auto-shutoff feature</Text>
                                </View>
                                <View style={{marginBottom: 10}}>
                                    <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>📈 Historical analytics</Text>
                                </View>
                                <View>
                                    <Text style={{fontSize: 12, color: THEME.darkGray, fontFamily: 'Poppins_600SemiBold'}}>👥 Emergency contacts management</Text>
                                </View>
                            </View>

                            <View style={{backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 30}}>
                                <Text style={{fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 8}}>Safety Thresholds</Text>
                                <Text style={{fontSize: 12, color: '#555', marginBottom: 4, fontFamily: 'Poppins_400Regular'}}>0-200 PPM: Clean Air ✅</Text>
                                <Text style={{fontSize: 12, color: '#555', marginBottom: 4, fontFamily: 'Poppins_400Regular'}}>200-1000 PPM: In Use 🔥</Text>
                                <Text style={{fontSize: 12, color: '#555', fontFamily: 'Poppins_400Regular'}}>1000+ PPM: Danger Zone ⚠️</Text>
                            </View>


                            {/* --- TEAM SECTION --- */}
                            <Text style={{fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 12}}>Development Team</Text>

                            <View style={{backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 15}}>
                                <Text style={{fontSize: 12, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 4}}>Course</Text>
                                <Text style={{fontSize: 12, color: '#555', fontFamily: 'Poppins_600SemiBold', marginBottom: 8}}>CPE 0414.1 - Capstone Project</Text>
                                
                                <Text style={{fontSize: 12, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 4}}>Group Number</Text>
                                <Text style={{fontSize: 12, color: '#555', fontFamily: 'Poppins_600SemiBold', marginBottom: 8}}>Group 3</Text>
                                
                                <Text style={{fontSize: 12, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 4}}>Institution</Text>
                                <Text style={{fontSize: 12, color: '#555', fontFamily: 'Poppins_400Regular', lineHeight: 18}}>Pamantasan ng Lungsod ng Maynila{'\n'}BS Computer Engineering</Text>
                            </View>

                            <View style={{backgroundColor: '#FFF0F0', borderRadius: 12, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: THEME.primaryRed, marginBottom: 15}}>
                                <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFE0E0'}}>
                                    <Text style={{fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray}}>Concepcion, John Angelo</Text>
                                </View>
                                <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFE0E0'}}>
                                    <Text style={{fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray}}>Delos Santos, Robert Jr. C.</Text>
                                </View>
                                <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFE0E0'}}>
                                    <Text style={{fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray}}>Leonardo, Aaron Joseph S.</Text>
                                </View>
                                <View style={{padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFE0E0'}}>
                                    <Text style={{fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray}}>Palomares, Jehann Chelsey J.</Text>
                                </View>
                                <View style={{padding: 12}}>
                                    <Text style={{fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray}}>Reyes, Larianne Ayezah C.</Text>
                                </View>
                            </View>

                            <View style={{backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 20}}>
                                <Text style={{fontSize: 12, fontFamily: 'Poppins_700Bold', color: THEME.darkGray, marginBottom: 6}}>Thesis Advisor</Text>
                                <Text style={{fontSize: 12, color: '#555', fontFamily: 'Poppins_600SemiBold'}}>Engr. Evangeline P. Lubao</Text>
                            </View>

                        </ScrollView>

                        {/* Subtle Close Button */}
                        <TouchableOpacity 
                            style={{
                                backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', 
                                marginTop: 15, borderWidth: 1, borderColor: '#E0E0E0'
                            }} 
                            onPress={() => setAboutModalVisible(false)}
                        >
                            <Text style={{fontSize: 14, color: THEME.darkGray, fontFamily: 'Poppins_700Bold'}}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ==========================================
// 4. MAIN DASHBOARD (Exported Container)
// ==========================================
export default function DashboardScreen() {
  let [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, Poppins_900Black });
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [activeTab, setActiveTab] = useState('Home');

  useEffect(() => { 
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token)); 
  }, []);

  if (!fontsLoaded) return null;

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen />;
      case 'History': return <HistoryScreen />;
      case 'Contacts': return <EmergencyScreen />;
      case 'Settings': return <SettingsScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="dark-content" />
      
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      <View style={styles.customTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Home')}>
          <Feather name="home" size={24} color={activeTab === 'Home' ? THEME.primaryRed : '#999'} />
          <Text style={[styles.tabLabelText, { color: activeTab === 'Home' ? THEME.primaryRed : '#999' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('History')}>
          <Feather name="calendar" size={24} color={activeTab === 'History' ? THEME.primaryRed : '#999'} />
          <Text style={[styles.tabLabelText, { color: activeTab === 'History' ? THEME.primaryRed : '#999' }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Contacts')}>
          <Feather name="phone" size={24} color={activeTab === 'Contacts' ? THEME.primaryRed : '#999'} />
          <Text style={[styles.tabLabelText, { color: activeTab === 'Contacts' ? THEME.primaryRed : '#999' }]}>Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Settings')}>
          <Feather name="settings" size={24} color={activeTab === 'Settings' ? THEME.primaryRed : '#999'} />
          <Text style={[styles.tabLabelText, { color: activeTab === 'Settings' ? THEME.primaryRed : '#999' }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: THEME.background },
  headerContainer: { flexDirection: 'column', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0E0E0' },
  statusBanner: { padding: 20, borderRadius: 16, alignItems: 'center', marginTop: -50, marginBottom: 10, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  statusBannerTitle: { fontSize: 24, fontFamily: 'Poppins_900Black', color: 'white', marginLeft: 10 },
  statusBannerDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 5, textAlign:'center' },
  trendTag: { marginTop: 10, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, flexDirection:'row', alignItems:'center' },
  safetyCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: THEME.primaryRed, marginBottom: 15 },
  safetyHeader: { backgroundColor: THEME.primaryRed, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  safetyHeaderText: { color: 'white', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  safetyList: { padding: 20 },
  safetyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  safetyItemTitle: { fontFamily: 'Poppins_700Bold', color: THEME.primaryRed, fontSize: 16 },
  safetyItemDesc: { fontSize: 13, color: '#555', marginTop: 2 },
  emergencyBtnLarge: { backgroundColor: THEME.primaryRed, padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: THEME.primaryRed, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:5, elevation:5 },
  emergencyBtnText: { color: 'white', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  controlCard: { backgroundColor: 'white', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: THEME.darkGray },
  progressBarBg: { height: 8, backgroundColor: '#EEE', borderRadius: 4, width: '100%', marginTop: 5 },
  progressBarFill: { height: 8, backgroundColor: THEME.primaryRed, borderRadius: 4 },
  valveButton: { padding: 18, borderRadius: 16, marginBottom: 15, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4, borderWidth: 2 },
  valveButtonDesc: { fontSize: 12, color: THEME.darkGray, marginTop: 2 },
  valvePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  valvePillText: { color: 'white', fontWeight: '700', fontSize: 14 },
  largeValveButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  largeValveTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  largeValveSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  screenTitle: { fontSize: 28, fontFamily: 'Poppins_900Black', color: THEME.primaryRed, marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: THEME.primaryRed, marginTop: 40, marginBottom: 10 },
  logItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: THEME.primaryRed },
  emergencyCardRed: { backgroundColor: THEME.primaryRed, padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.primaryRed, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontFamily: 'Poppins_700Bold', color: THEME.darkGray, fontSize: 16 },
  contactRole: { fontSize: 12, color: '#666' },
  callIconBtn: { padding: 10, backgroundColor: '#FFF0E0', borderRadius: 10 },
  addMemberBtn: { backgroundColor: THEME.primaryRed, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  deleteAction: { backgroundColor: THEME.primaryRed, justifyContent: 'center', alignItems: 'center', width: 70, marginBottom: 10, borderRadius: 12, marginRight: 10 },
  editAction: { backgroundColor: THEME.editBlue, justifyContent: 'center', alignItems: 'center', width: 70, marginBottom: 10, borderRadius: 12, marginLeft: 10 },
  addMemberModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: THEME.primaryRed },
  textInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, color: THEME.darkGray },
  dropdown: { height: 50, borderColor: '#DDD', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, backgroundColor: '#F9F9F9' },
  continueBtn: { backgroundColor: THEME.primaryRed, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  logoutBtnNew: { backgroundColor: THEME.primaryRed, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: THEME.darkGray, marginBottom: 4, marginLeft: 4 },
  errorBorder: { borderColor: THEME.primaryRed, borderWidth: 1.5, backgroundColor: '#FFF0F0' },
  errorText: { color: THEME.primaryRed, fontSize: 10, marginLeft: 5, marginTop: 2, fontFamily: 'Poppins_400Regular' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 15, padding: 5, elevation: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: THEME.primaryRed },
  tabText: { fontFamily: 'Poppins_600SemiBold', color: THEME.primaryRed, fontSize: 14 },
  tabTextActive: { color: 'white' },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: '#666' },
 customTabBar: { 
    flexDirection: 'row', 
    backgroundColor: THEME.surface, // Back to your clean cream/surface color
    height: Platform.OS === 'ios' ? 85 : 70, 
    paddingTop: 10, 
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: '#000', // Standard subtle shadow
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  tabLabelText: {
    fontSize: 10, 
    fontFamily: 'Poppins_600SemiBold', 
    marginTop: 4
  },
  tabLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', marginTop: 4 },
  tabButtonAbout: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabButtonAboutActive: { backgroundColor: THEME.primaryRed },
});