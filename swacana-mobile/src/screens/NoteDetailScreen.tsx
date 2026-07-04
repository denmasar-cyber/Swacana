import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = '@swacana_notes';

export default function NoteDetailScreen({ route, navigation }: any) {
  const { note } = route.params as { note: Note };
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saved, setSaved] = useState(true);

  const saveNote = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const notes: Note[] = stored ? JSON.parse(stored) : [];
      const updated = notes.map(n =>
        n.id === note.id
          ? { ...n, title, content, updatedAt: new Date().toISOString() }
          : n
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(true);
      Alert.alert('✅ Saved', 'Note saved successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const deleteNote = () => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const notes: Note[] = stored ? JSON.parse(stored) : [];
            const updated = notes.filter(n => n.id !== note.id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const handleTextChange = (text: string) => {
    setContent(text);
    setSaved(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={saveNote} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>💾 Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteNote} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={(t) => { setTitle(t); setSaved(false); }}
        placeholder="Note title..."
        placeholderTextColor="#9a8f80"
      />

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Created: {new Date(note.createdAt).toLocaleDateString('id-ID')}
        </Text>
        <Text style={[styles.metaText, !saved && { color: '#d4a373' }]}>
          {saved ? '✓ Saved' : '● Unsaved changes'}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentContainer}>
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={handleTextChange}
          placeholder="Write your note here..."
          placeholderTextColor="#9a8f80"
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Word count */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {content.split(/\s+/).filter(Boolean).length} words · {content.length} chars
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1512' },
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#5a4f44',
  },
  backBtn: { color: '#d4a373', fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  saveBtn: {
    backgroundColor: '#d4a373', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  titleInput: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: '#2a221e', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 10, padding: 12, color: '#e8ddd0', fontSize: 16, fontWeight: '700',
  },
  meta: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  metaText: { color: '#9a8f80', fontSize: 10 },
  contentContainer: { flex: 1, paddingHorizontal: 16 },
  contentInput: {
    backgroundColor: '#2a221e20', borderWidth: 1, borderColor: '#5a4f4430',
    borderRadius: 10, padding: 14, color: '#e8ddd0', fontSize: 13,
    lineHeight: 22, minHeight: 300,
  },
  footer: {
    paddingVertical: 8, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#5a4f44',
  },
  footerText: { color: '#5a4f44', fontSize: 10, textAlign: 'right' },
});
