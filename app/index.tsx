import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_900Black,
  useFonts
} from '@expo-google-fonts/poppins';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LogBox,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { auth } from '../firebaseConfig';

LogBox.ignoreLogs(['Virtual Log', 'Text string must be rendered']);

// --- DESIGN THEME ---
const THEME = {
  background: '#FFFBF5',    
  primaryRed: '#b91c1c',    
  safeGreen: '#10B981',     
  cookingOrange: '#F59E0B', 
  darkGray: '#37474F',   
};

export default function LoginScreen() {
  const router = useRouter();

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_900Black,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Inline Error States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Forgot Password States
  const [isForgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Prevent rendering until fonts are loaded to avoid flickering
  if (!fontsLoaded) {
    return null;
  }

  // Handle Standard Firebase Login
  const handleLogin = async () => {
    Keyboard.dismiss();

    const trimmedEmail = email.trim();

    // Reset previous inline errors
    setEmailError('');
    setPasswordError('');

    let isValid = true;

    if (trimmedEmail === '') {
      setEmailError('Please enter your email address.');
      isValid = false;
    }
    
    if (password === '') {
      setPasswordError('Please enter your password.');
      isValid = false;
    }

    // Stop execution if any local checks failed
    if (!isValid) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      console.log("Logged in successfully!");
      router.replace('/dashboard'); 
    } catch (error: any) {
      console.error(error.code);
      
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setPasswordError('Invalid email or password.');
          break;
        case 'auth/invalid-email':
          setEmailError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setPasswordError('Too many failed attempts. Try again later.');
          break;
        case 'auth/network-request-failed':
          setPasswordError('Check your internet connection and try again.');
          break;
        default:
          setPasswordError('Login failed. Please try again.');
          break;
      }
      setPassword(''); // Clear the password field so they can try again
    } finally {
      setLoading(false);
    }
    
    /*const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists() && userDoc.data().hasDevice) {
        // They already have a device! Go to Dashboard
        router.replace('/dashboard');
      } else {
        // No device linked yet! Send them to Setup first
        router.replace('/add_device'); 
      }
    }
  */
    };
  // Handle Forgot Password
  const handleForgotPassword = async () => {
    Keyboard.dismiss();

    const trimmedEmail = resetEmail.trim();

    if (trimmedEmail === '') {
      Alert.alert("Missing Info", "Please enter your email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        "Success",
        "Password reset email sent! Check your inbox and follow the instructions."
      );
      setForgotPasswordModalVisible(false);
      setResetEmail('');
    } catch (error: any) {
      console.error(error.code);
      let errorMessage = 'Failed to send reset email. Please try again.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Check your internet connection and try again.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
          <View style={[styles.inputContainer, emailError !== '' && styles.inputError]}>
            <Mail color={THEME.primaryRed} size={20} style={styles.icon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#888"
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(''); // Clears error when typing
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
          {/* Email Helper Text */}
          {emailError !== '' && (
            <Text style={styles.helperText}>{emailError}</Text>
          )}

          {/* Password Input */}
          <View style={[styles.inputContainer, passwordError !== '' && styles.inputError]}>
            <Lock color={THEME.primaryRed} size={20} style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError(''); // Clears error when typing
                setEmailError(''); // Clears email error too in case of "Invalid Credentials"
              }}
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
          {/* Password Helper Text */}
          {passwordError !== '' && (
            <Text style={styles.helperText}>{passwordError}</Text>
          )}

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotContainer}
            onPress={() => setForgotPasswordModalVisible(true)}
          >
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

      {/* Forgot Password Modal */}
      <Modal 
        visible={isForgotPasswordModalVisible} 
        animationType="slide" 
        transparent={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setForgotPasswordModalVisible(false);
                    setResetEmail('');
                  }}
                >
                  <Text style={styles.modalCloseBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <View style={styles.modalInputContainer}>
                <Mail color={THEME.primaryRed} size={20} style={styles.icon} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#888"
                  style={styles.modalInput}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, resetLoading && { opacity: 0.7 }]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                <Text style={styles.modalButtonText}>
                  {resetLoading ? "SENDING..." : "SEND RESET LINK"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  setForgotPasswordModalVisible(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background, 
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
    fontFamily: 'Poppins_700Bold', 
    color: THEME.primaryRed, 
  },
  brandSubtitle: {
    fontSize: 14,
    color: THEME.primaryRed,
    fontFamily: 'Poppins_600SemiBold', 
    marginTop: 5,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: THEME.primaryRed, 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 20, 
    elevation: 15, 
    shadowColor: '#ce7373', 
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold', 
    color: '#fff',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: '#ffcccc', 
    fontFamily: 'Poppins_400Regular', 
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
  inputError: {
    borderWidth: 2,
    borderColor: '#ff4444', 
  },
  helperText: {
    color: '#ffcccc',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: -10, 
    marginBottom: 15, 
    marginLeft: 5,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME.darkGray,
    fontFamily: 'Poppins_400Regular', 
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins_400Regular', 
  },
  loginButton: {
    backgroundColor: THEME.background, 
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  loginButtonText: {
    color: THEME.primaryRed,
    fontSize: 18,
    fontFamily: 'Poppins_700Bold', 
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30, 
  },
  signupText: {
    color: '#ffcccc',
    fontFamily: 'Poppins_400Regular', 
  },
  signupLink: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins_700Bold', 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    color: THEME.primaryRed,
    fontFamily: 'Poppins_700Bold', 
  },
  modalCloseBtn: {
    fontSize: 24,
    color: '#888',
    fontFamily: 'Poppins_700Bold', 
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular', 
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.darkGray,
    marginLeft: 10,
    fontFamily: 'Poppins_400Regular', 
  },
  modalButton: {
    backgroundColor: THEME.primaryRed,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold', 
  },
  modalCancelText: {
    textAlign: 'center',
    color: THEME.primaryRed,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold', 
  },
});