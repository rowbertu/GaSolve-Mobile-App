import { Stack, usePathname, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, SafeAreaView, StatusBar, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname(); // <-- This is much safer than useSegments!

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // ⏱️ THE FIX: Force the splash screen to stay visible for 2 seconds (2000ms)
      setTimeout(() => {
        if (initializing) setInitializing(false);
      }, 2000); 
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;

    // Check exactly which screen we are on
    const isAtLogin = pathname === '/' || pathname === '/index';
    const isAtSignup = pathname === '/signup';

    if (user) {
      // ✅ Only auto-forward to Dashboard if they are staring at the Login screen
      if (isAtLogin) {
        setTimeout(() => router.replace('/dashboard'), 10);
      }
    } else {
      // ❌ If NOT logged in, and they try to visit the dashboard, kick them back
      if (!isAtLogin && !isAtSignup) {
        setTimeout(() => router.replace('/'), 10);
      }
    }
  }, [user, initializing, pathname]);

  // --- SECONDARY SPLASH SCREEN ---
  if (initializing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFBF5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image 
            source={require('../assets/images/RED_LOGO.png')} 
            style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }} 
          />
          <ActivityIndicator size="small" color="#DC2626" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFBF5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </SafeAreaView>
  );
}