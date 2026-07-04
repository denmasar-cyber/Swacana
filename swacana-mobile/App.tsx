import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, ActivityIndicator } from 'react-native';

import ScannerScreen from './src/screens/ScannerScreen';
import NotesScreen from './src/screens/NotesScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1512', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#d4a373', fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>S</Text>
      <ActivityIndicator size="small" color="#d4a373" />
      <Text style={{ color: '#9a8f80', fontSize: 12, marginTop: 12 }}>Loading Swacana...</Text>
    </View>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Scanner': '📷',
    'Notes': '📝',
    'Settings': '⚙️',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || '•'}
    </Text>
  );
}

function NotesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1512' },
        headerTintColor: '#e8ddd0',
        headerShown: false,
      }}
    >
      <Stack.Screen name="NotesList" component={NotesScreen} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsReady(true), 500);
  }, []);

  if (!isReady) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#1a1512', borderBottomColor: '#5a4f44' },
            headerTintColor: '#e8ddd0',
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            tabBarStyle: {
              backgroundColor: '#1a1512',
              borderTopColor: '#5a4f44',
              height: 60,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarActiveTintColor: '#d4a373',
            tabBarInactiveTintColor: '#9a8f80',
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name} focused={focused} />
            ),
          })}
        >
          <Tab.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{ title: '📷 Scanner' }}
          />
          <Tab.Screen
            name="Notes"
            component={NotesStack}
            options={{ title: '📝 Notes' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: '⚙️ Settings' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
