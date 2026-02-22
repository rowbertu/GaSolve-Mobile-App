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
import { auth, db } from '../firebaseConfig'; // Make sure this path is correct!

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    Keyboard.dismiss(); // Clean UX: Hide keyboard immediately

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (trimmedEmail === '' || password === '' || trimmedName === '') {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the account
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Save the Username and Email to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: 'Homeowner', // Good to have for your GaSolve system
        createdAt: serverTimestamp(),
      });

      console.log('User saved to Firestore!');
      Alert.alert('Success', 'Account created! Please log in with your new credentials.');
      
      // 3. Force Sign Out so they can test the login screen
      await signOut(auth);

      // 4. Send them back to the Login screen
      router.replace('/');

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Something went wrong.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'That email is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak.';
          break;
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
        keyboardShouldPersistTaps="handled" // Allows user to tap buttons while keyboard is open
      >
        {/* --- TOP SECTION --- */}
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/images/RED_LOGO.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>GaSolve</Text>
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
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#888" size={20} /> : <Eye color="#888" size={20} />}
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Lock color="#b91c1c" size={20} style={styles.icon} />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
            />
          </View>

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
    justifyContent: 'space-between', // Pushes top section up and bottom card down
  },
  topSection: {
    paddingVertical: 50, // Replaced flex with padding for better ScrollView behavior
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { 
    width: 80, 
    height: 80, 
    marginBottom: 5 
  },
  brandTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#b91c1c' 
  },
  bottomCard: {
    flex: 1, // Expands to fill remaining space
    backgroundColor: '#b91c1c',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
    paddingBottom: 60, // Extra padding at the bottom for smooth scrolling
  },
  headerText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 5 
  },
  subText: { 
    fontSize: 14, 
    color: '#ffcccc', 
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
  icon: { 
    marginRight: 10 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#333' 
  },
  button: {
    backgroundColor: '#FDFBF7',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: { 
    color: '#b91c1c', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  loginContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  loginText: { 
    color: '#ffcccc' 
  },
  loginLink: { 
    color: '#fff', 
    fontWeight: 'bold', 
    textDecorationLine: 'underline' 
  },
});