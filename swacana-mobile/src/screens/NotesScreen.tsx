import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert,
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function NotesScreen({ navigation }: { navigation: any }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  };

  const saveNotes = async (updated: Note[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const createNote = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      title: newTitle.trim(),
      content: newContent.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [note, ...notes];
    await saveNotes(updated);
    setNewTitle('');
    setNewContent('');
    setShowNew(false);
  };

  const deleteNote = (id: string) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = notes.filter(n => n.id !== id);
          await saveNotes(updated);
        },
      },
    ]);
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 My Notes</Text>
        <Text style={styles.noteCount}>{notes.length} notes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes..."
          placeholderTextColor="#9a8f80"
        />
      </View>

      {/* New Note Button */}
      <TouchableOpacity style={styles.newNoteBtn} onPress={() => setShowNew(!showNew)}>
        <Text style={styles.newNoteBtnText}>{showNew ? '✕ Cancel' : '+ New Note'}</Text>
      </TouchableOpacity>

      {/* New Note Form */}
      {showNew && (
        <View style={styles.newNoteForm}>
          <TextInput
            style={styles.titleInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Note title..."
            placeholderTextColor="#9a8f80"
          />
          <TextInput
            style={styles.contentInput}
            value={newContent}
            onChangeText={setNewContent}
            placeholder="Write your note here..."
            placeholderTextColor="#9a8f80"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={createNote}>
            <Text style={styles.saveBtnText}>💾 Save Note</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notes List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.noteCard}
            onPress={() => navigation.navigate('NoteDetail', { note: item })}
            onLongPress={() => deleteNote(item.id)}
          >
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
            </View>
            {item.content ? (
              <Text style={styles.notePreview} numberOfLines={3}>{item.content}</Text>
            ) : (
              <Text style={styles.noteEmpty}>No content yet</Text>
            )}
            <View style={styles.noteFooter}>
              <Text style={styles.noteChars}>{item.content.length} chars</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptyHint}>Tap "+ New Note" to create your first note</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1512' },
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#e8ddd0', fontSize: 20, fontWeight: 'bold' },
  noteCount: { color: '#9a8f80', fontSize: 12 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#2a221e', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 10, padding: 10, color: '#e8ddd0', fontSize: 13,
  },
  newNoteBtn: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#d4a373',
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  newNoteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  newNoteForm: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#2a221e',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#5a4f44',
  },
  titleInput: {
    backgroundColor: '#1a1512', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 8, padding: 10, color: '#e8ddd0', fontSize: 14,
    fontWeight: '600', marginBottom: 8,
  },
  contentInput: {
    backgroundColor: '#1a1512', borderWidth: 1, borderColor: '#5a4f44',
    borderRadius: 8, padding: 10, color: '#e8ddd0', fontSize: 12,
    minHeight: 100, marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#d4a373', paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  noteCard: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#2a221e',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#5a4f44',
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteTitle: { color: '#e8ddd0', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  noteDate: { color: '#9a8f80', fontSize: 10 },
  notePreview: { color: '#9a8f80', fontSize: 12, lineHeight: 18 },
  noteEmpty: { color: '#9a8f80', fontSize: 11, fontStyle: 'italic' },
  noteFooter: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  noteChars: { color: '#5a4f44', fontSize: 9 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#e8ddd0', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#9a8f80', fontSize: 12, marginTop: 6 },
});
