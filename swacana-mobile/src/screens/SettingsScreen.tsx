import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@swacana_server_url';

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem(SERVER_URL_KEY);
      if (url) setServerUrl(url);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl.trim());
      Alert.alert('✅ Saved', 'Server URL updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      const res = await fetch(serverUrl.trim(), {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      setConnectionStatus(res.ok ? 'ok' : 'error');
    } catch (e) {
      setConnectionStatus('error');
    }
  };

  const openWebApp = () => {
    Linking.openURL(serverUrl.trim());
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
      </View>

      {/* Server Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Server Connection</Text>
        <Text style={styles.sectionDesc}>Configure the Swacana web server URL to sync data.</Text>

        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.100:3000"
          placeholderTextColor="#9a8f80"
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={saveSettings}>
            <Text style={styles.btnText}>💾 Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={testConnection}>
            <Text style={styles.btnText}>
              {connectionStatus === 'checking' ? '⏳ Checking...' :
               connectionStatus === 'ok' ? '✅ Connected' :
               connectionStatus === 'error' ? '❌ Failed' : '🔌 Test'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnOutline} onPress={openWebApp}>
          <Text style={styles.btnOutlineText}>🌐 Open Web App</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 About Swacana Mobile</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Framework</Text>
          <Text style={styles.infoValue}>React Native + Expo</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Features</Text>
          <Text style={styles.infoValue}>QR Scanner, Notes, AI Chat</Text>
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Quick Links</Text>

        {[
          { label: '📖 Documentation', url: 'https://codebuff.com/docs' },
          { label: '🐛 Report Issue', url: 'https://github.com' },
        ].map((link) => (
          <TouchableOpacity key={link.label} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Features List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Features</Text>
        {[
          '📷 QR/Barcode Scanner with history',
          '📝 Offline notes with local storage',
          '🔗 Connect to Swacana web server',
          '🌙 Dark mode (vintage claymorphism)',
          '📊 Word & character count',
          '🔍 Search notes instantly',
        ].map((feature, i) => (
          <Text key={i} style={styles.featureItem}>{feature}</Text>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Made with ♥ by Swacana Team</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1512' },
  header: {
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { color: '#e8ddd0', fontSize: 20, fontWeight: 'bold' },
  section: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#2a221e',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#5a4f44',
  },
  sectionTitle: { color: '#e8ddd0', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { color: '#9a8f80', fontSize: 11, marginBottom: 12 },
  input: {
    backgroundColor: '#1a1512', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 10, padding: 12, color: '#e8ddd0', fontSize: 13,
    marginBottom: 12,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btnPrimary: {
    flex: 1, backgroundColor: '#d4a373', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  btnSecondary: {
    flex: 1, backgroundColor: '#5a4f44', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  btnOutline: {
    borderWidth: 1, borderColor: '#d4a373', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  btnOutlineText: { color: '#d4a373', fontWeight: '600', fontSize: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#5a4f4430',
  },
  infoLabel: { color: '#9a8f80', fontSize: 12 },
  infoValue: { color: '#e8ddd0', fontSize: 12 },
  linkRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#5a4f4430',
  },
  linkLabel: { color: '#d4a373', fontSize: 13 },
  linkArrow: { color: '#9a8f80', fontSize: 14 },
  featureItem: { color: '#9a8f80', fontSize: 12, paddingVertical: 4 },
  footer: { color: '#5a4f44', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
