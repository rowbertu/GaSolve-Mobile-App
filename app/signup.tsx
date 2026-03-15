import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from '@expo-google-fonts/poppins';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
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
import { auth, db } from '../firebaseConfig';

export default function SignUpScreen() {
  const router = useRouter();

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Inline Error States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Prevent rendering until fonts are loaded to avoid flickering
  if (!fontsLoaded) {
    return null;
  }

  const handleSignUp = async () => {
    Keyboard.dismiss(); 

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    // Reset previous inline errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    let isValid = true;

    if (trimmedEmail === '' || password === '' || trimmedName === '') {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Check 1: Password length
    if (password.length < 6) {
      setPasswordError('Password should be at least 6 characters.');
      isValid = false;
    }

    // Check 2: Passwords match
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    // Stop execution if any local checks failed
    if (!isValid) return;

    setLoading(true);
    try {
      // 1. Create the account (Firebase auto-logs them in)
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Save the Username and Email to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: 'Homeowner', 
        createdAt: serverTimestamp(),
      });

      console.log('User saved to Firestore!');
      Alert.alert('Success', 'Account created! Please log in with your new credentials.');
      
      // 3. Force Sign Out
      await signOut(auth);

      // 4. 🛡️ THE FIX: Wait 100 milliseconds for Firebase to clear the token 
      // BEFORE moving back to the Login page. No more dashboard glimpses!
      setTimeout(() => {
        router.replace('/');
      }, 100);

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Something went wrong.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          setEmailError('That email is already registered.');
          setLoading(false);
          return; 
        case 'auth/invalid-email':
          setEmailError('Please enter a valid email address.');
          setLoading(false);
          return;
        case 'auth/weak-password':
          setPasswordError('The password is too weak.');
          setLoading(false);
          return;
        case 'auth/network-request-failed':
          errorMessage = 'Check your internet connection and try again.';
          break;
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
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
        keyboardShouldPersistTaps="handled" 
      >
        {/* --- TOP SECTION --- */}
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/images/RED_LOGO.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>GaSolve</Text>
          <Text style={styles.brandSubtitle}>LPG Leak Monitoring System</Text>
        </View>

        {/* --- BOTTOM CARD --- */}
        <View style={styles.bottomCard}>
          <Text style={styles.headerText}>Get Started</Text>
          <Text style={styles.subText}>Create your account to start monitoring</Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <User color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#888"
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
            />
          </View>

          {/* Email Input */}
          <View style={[styles.inputContainer, emailError !== '' && styles.inputError]}>
            <Mail color="#b91c1c" size={20} style={styles.icon} />
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
            <Lock color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError(''); // Clears error when typing
              }}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#888" size={20} /> : <Eye color="#888" size={20} />}
            </TouchableOpacity>
          </View>
          {/* Password Helper Text */}
          {passwordError !== '' && (
            <Text style={styles.helperText}>{passwordError}</Text>
          )}

          {/* Confirm Password Input */}
          <View style={[styles.inputContainer, confirmPasswordError !== '' && styles.inputError]}>
            <Lock color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError(''); // Clears error when typing
              }}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
            />
          </View>
          {/* Confirm Password Helper Text */}
          {confirmPasswordError !== '' && (
            <Text style={styles.helperText}>{confirmPasswordError}</Text>
          )}

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "CREATING..." : "SIGN UP"}</Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Log In</Text>
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
    backgroundColor: '#FDFBF7' 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between', 
  },
  topSection: {
    paddingTop: 30,    
    paddingBottom: 20, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { 
    width: 90, 
    height: 90, 
    marginBottom: 5,
    marginTop: 5, 
  },
  brandTitle: { 
    fontSize: 24, 
    fontFamily: 'Poppins_700Bold', 
    color: '#b91c1c'
  },
  brandSubtitle: { 
    fontSize: 14, 
    color: '#b91c1c', 
    fontFamily: 'Poppins_600SemiBold', 
    marginTop: 5 
  },   
  bottomCard: {
    flex: 1, 
    backgroundColor: '#b91c1c',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 60, 
    elevation: 15, 
    shadowColor: '#ce7373', 
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  headerText: { 
    fontSize: 24, 
    fontFamily: 'Poppins_700Bold', 
    color: '#fff', 
    marginBottom: 5 
  },
  subText: { 
    fontSize: 14, 
    color: '#ffcccc', 
    fontFamily: 'Poppins_400Regular', 
    marginBottom: 25 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
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
    marginRight: 10 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#333',
    fontFamily: 'Poppins_400Regular', 
  },
  button: {
    backgroundColor: '#FDFBF7',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    elevation: 2, 
  },
  buttonText: { 
    color: '#b91c1c', 
    fontSize: 18, 
    fontFamily: 'Poppins_700Bold', 
  },
  loginContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  loginText: { 
    color: '#ffcccc',
    fontFamily: 'Poppins_400Regular', 
  },
  loginLink: { 
    color: '#fff', 
    fontFamily: 'Poppins_700Bold', 
    textDecorationLine: 'underline' 
  },
});