import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e', // Maybe Orange for LPG/Fire safety?
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* 1. The Login Screen (index.tsx) */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Welcome',
          headerShown: false // Hides header for a clean Login screen
        }} 
      />

      {/* 2. The Registration Screen */}
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'Create Account',
          headerBackTitle: 'Login' // Custom back button text
        }} 
      />

      {/* 3. The Main Dashboard (after login) */}
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'LPG Safety Monitor',
          headerLeft: () => null, // Hide back button so they can't go back to login
        }} 
      />
    </Stack>
  );
}