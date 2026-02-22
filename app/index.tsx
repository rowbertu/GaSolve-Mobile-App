import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../firebaseConfig'; // Make sure this path is correct!

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle Standard Firebase Login
  const handleLogin = async () => {
    Keyboard.dismiss(); // Hide keyboard for better UX

    const trimmedEmail = email.trim();

    if (trimmedEmail === '' || password === '') {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // Sign in with Firebase
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      console.log("Logged in successfully!");
      
      // Navigate to the dashboard upon success
      router.replace('/dashboard'); 

    } catch (error: any) {
      console.error(error.code);
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle specific Firebase login errors
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Check your internet connection and try again.';
          break;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" // Allows tapping the login button while keyboard is open
      >
        {/* --- TOP SECTION (Brand) --- */}
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/images/RED_LOGO.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>GaSolve</Text>
          <Text style={styles.brandSubtitle}>LPG Leak Monitoring System</Text>
        </View>

        {/* --- BOTTOM SECTION (Red Card) --- */}
        <View style={styles.bottomCard}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.instructionText}>Login to monitor your safety</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Mail color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#888"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Lock color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? 
                <EyeOff color="#888" size={20} /> : 
                <Eye color="#888" size={20} />
              }
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "LOGGING IN..." : "LOG IN"}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7', 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between', 
  },
  topSection: {
    paddingVertical: 40, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#b91c1c', 
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  bottomCard: {
    flex: 1, // Expands to fill the bottom
    backgroundColor: '#b91c1c', 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 50, // Added padding for scroll breathing room
    elevation: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: '#ffcccc', 
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 15,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#FDFBF7', 
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  loginButtonText: {
    color: '#b91c1c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30, // Pushes to bottom
  },
  signupText: {
    color: '#ffcccc',
  },
  signupLink: {
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});