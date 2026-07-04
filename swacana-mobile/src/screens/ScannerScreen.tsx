import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking, TextInput, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flash, setFlash] = useState(false);
  const [history, setHistory] = useState<{ data: string; type: string; time: string }[]>([]);
  const [manualUrl, setManualUrl] = useState('');

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const time = new Date().toLocaleTimeString('id-ID');
    setHistory(prev => [{ data, type, time }, ...prev.slice(0, 49)]);

    // Try to open URL
    if (data.startsWith('http://') || data.startsWith('https://')) {
      Alert.alert(
        '🔗 URL Detected',
        data,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          { text: 'Open', onPress: () => { Linking.openURL(data); setScanned(false); } },
        ]
      );
    } else {
      Alert.alert('📱 Barcode Scanned', `Type: ${type}\nData: ${data}`, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const openManualUrl = () => {
    const url = manualUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    Linking.openURL(url);
  };

  if (!permission) return <View style={styles.container}><Text style={styles.text}>Loading camera...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.text}>Swacana needs camera access to scan QR codes and barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>

        <View style={styles.manualSection}>
          <Text style={styles.label}>Or enter URL manually:</Text>
          <TextInput
            style={styles.input}
            value={manualUrl}
            onChangeText={setManualUrl}
            placeholder="https://localhost:3000"
            placeholderTextColor="#9a8f80"
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={styles.buttonSecondary} onPress={openManualUrl}>
            <Text style={styles.buttonText}>Open URL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.scanTitle}>📷 Scan QR / Barcode</Text>
          <TouchableOpacity onPress={() => setFlash(!flash)} style={styles.flashBtn}>
            <Text style={{ fontSize: 18 }}>{flash ? '🔦' : '💡'}</Text>
          </TouchableOpacity>
        </View>

        {/* Scan frame */}
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <Text style={styles.hint}>Align the barcode within the frame</Text>

        {/* Manual URL input */}
        <View style={styles.manualBar}>
          <TextInput
            style={styles.manualInput}
            value={manualUrl}
            onChangeText={setManualUrl}
            placeholder="Or paste URL to open..."
            placeholderTextColor="#9a8f80"
            autoCapitalize="none"
            keyboardType="url"
            onSubmitEditing={openManualUrl}
          />
          <TouchableOpacity style={styles.openBtn} onPress={openManualUrl}>
            <Text style={{ color: '#fff', fontSize: 11 }}>Open</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Scans</Text>
            <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
              {history.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.historyItem}
                  onPress={() => {
                    if (item.data.startsWith('http')) Linking.openURL(item.data);
                  }}
                >
                  <Text style={styles.historyData} numberOfLines={1}>{item.data}</Text>
                  <Text style={styles.historyTime}>{item.time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1512' },
  text: { color: '#9a8f80', fontSize: 13, textAlign: 'center', marginHorizontal: 32 },
  title: { color: '#e8ddd0', fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  icon: { fontSize: 48, marginBottom: 8 },
  button: {
    backgroundColor: '#d4a373', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 20,
  },
  buttonSecondary: {
    backgroundColor: '#5a4f44', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  manualSection: { marginTop: 32, paddingHorizontal: 32 },
  label: { color: '#9a8f80', fontSize: 11, marginBottom: 8 },
  input: {
    backgroundColor: '#2a221e', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 10, padding: 12, color: '#e8ddd0', fontSize: 13,
  },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent', justifyContent: 'space-between' },
  topBar: {
    backgroundColor: 'rgba(26,21,18,0.85)', paddingTop: 48, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  scanTitle: { color: '#e8ddd0', fontSize: 15, fontWeight: '600' },
  flashBtn: { padding: 8 },
  scanFrame: {
    width: 260, height: 260, alignSelf: 'center', marginTop: 40,
  },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#d4a373' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  hint: { color: '#d4a373', fontSize: 12, textAlign: 'center', marginTop: 20 },
  manualBar: {
    flexDirection: 'row', backgroundColor: 'rgba(26,21,18,0.85)',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  manualInput: {
    flex: 1, backgroundColor: '#2a221e', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    color: '#e8ddd0', fontSize: 12,
  },
  openBtn: {
    backgroundColor: '#d4a373', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, justifyContent: 'center',
  },
  historyContainer: {
    backgroundColor: 'rgba(26,21,18,0.85)', paddingHorizontal: 16,
    paddingBottom: 32, paddingTop: 8,
  },
  historyTitle: { color: '#9a8f80', fontSize: 10, fontWeight: '600', marginBottom: 6 },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#5a4f4430',
  },
  historyData: { color: '#e8ddd0', fontSize: 11, flex: 1, marginRight: 8 },
  historyTime: { color: '#9a8f80', fontSize: 9 },
});
