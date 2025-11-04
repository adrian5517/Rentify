# 💬 React Native Expo - Messages Integration Guide

## 📋 Overview
Complete guide for integrating real-time messaging in your Rentify mobile app using React Native Expo and Socket.io.

---

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
npm install socket.io-client axios @react-native-async-storage/async-storage
# or
yarn add socket.io-client axios @react-native-async-storage/async-storage
```

### Optional (for better UI):
```bash
expo install react-native-gifted-chat
```

---

## 📁 Project Structure

```
src/
├── services/
│   ├── socket.js          # Socket.io configuration
│   ├── api.js             # API endpoints
│   └── messageService.js  # Message operations
├── screens/
│   ├── MessagesScreen.js  # Messages list
│   └── ChatScreen.js      # Individual chat
├── store/
│   └── authStore.js       # User authentication state
└── components/
    ├── MessageItem.js     # Message bubble component
    └── ChatInput.js       # Message input component
```

---

## 🔧 Configuration Files

### 1. API Configuration (`services/api.js`)

```javascript
// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ UPDATE THIS with your production URL
const BASE_URL = 'https://rentify-server-ge0f.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export { BASE_URL, api };
```

---

### 2. Socket.io Setup (`services/socket.js`)

```javascript
// services/socket.js
import { io } from 'socket.io-client';
import { BASE_URL } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connect to socket server
  connect(userId) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to socket server...');
    
    this.socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      
      // Register user with socket
      if (userId) {
        this.socket.emit('register', userId);
        console.log('User registered:', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  // Send message
  sendMessage(messageData) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }

    console.log('Sending message via socket:', messageData);
    this.socket.emit('send-message', messageData);
    return true;
  }

  // Listen for new messages
  onMessage(callback) {
    if (!this.socket) return;
    
    this.socket.on('receive-message', (message) => {
      console.log('New message received:', message);
      callback(message);
    });
  }

  // Mark messages as read
  markAsRead(messageIds, userId) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('mark-read', { messageIds, userId });
  }

  // Listen for read receipts
  onMessagesRead(callback) {
    if (!this.socket) return;
    
    this.socket.on('messages-read', (data) => {
      callback(data);
    });
  }

  // Remove listener
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Get connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new SocketService();
```

---

### 3. Message Service (`services/messageService.js`)

```javascript
// services/messageService.js
import { api } from './api';

export const messageService = {
  // Get all users (for contacts list)
  async getAllUsers() {
    try {
      const response = await api.get('/api/auth/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get messages between two users
  async getMessages(userId, otherUserId) {
    try {
      const response = await api.get(`/api/messages/${userId}/${otherUserId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send message via API (backup/persistent storage)
  async sendMessage(senderId, receiverId, text) {
    try {
      const response = await api.post('/api/messages', {
        senderId,
        receiverId,
        text,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(userId, senderId) {
    try {
      const response = await api.put('/api/messages/mark-read', {
        userId,
        senderId,
      });
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Get unread message count
  async getUnreadCount(userId) {
    try {
      const response = await api.get(`/api/messages/unread/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },
};
```

---

## 📱 Screen Components

### 1. Messages List Screen (`screens/MessagesScreen.js`)

```javascript
// screens/MessagesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageService } from '../services/messageService';
import socketService from '../services/socket';

export default function MessagesScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadContacts();
    setupSocketListener();

    return () => {
      socketService.off('receive-message');
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await messageService.getAllUsers();
      
      if (data.success) {
        // Filter out current user
        const userJson = await AsyncStorage.getItem('user');
        const currentUser = JSON.parse(userJson);
        
        const filteredUsers = data.users.filter(
          (user) => user._id !== currentUser._id
        );
        
        setContacts(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListener = () => {
    socketService.onMessage((message) => {
      // Refresh contacts list to show new message preview
      loadContacts();
    });
  };

  const openChat = (contact) => {
    navigation.navigate('Chat', {
      contactId: contact._id,
      contactName: contact.fullName || contact.username,
      contactPhoto: contact.profilePicture,
    });
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => openChat(item)}
    >
      <Image
        source={{
          uri: item.profilePicture || 'https://via.placeholder.com/50',
        }}
        style={styles.avatar}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.fullName || item.username}
        </Text>
        <Text style={styles.contactEmail}>{item.email}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id}
        renderItem={renderContactItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No contacts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

---

### 2. Chat Screen (`screens/ChatScreen.js`)

```javascript
// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { messageService } from '../services/messageService';
import socketService from '../services/socket';

export default function ChatScreen() {
  const route = useRoute();
  const { contactId, contactName, contactPhoto } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    initializeChat();
    
    return () => {
      socketService.off('receive-message');
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Get current user
      const userJson = await AsyncStorage.getItem('user');
      const user = JSON.parse(userJson);
      setCurrentUser(user);

      // Load messages
      await loadMessages(user._id);

      // Setup socket listener
      socketService.onMessage((message) => {
        // Only add messages for this conversation
        if (
          (message.senderId === user._id && message.receiverId === contactId) ||
          (message.senderId === contactId && message.receiverId === user._id)
        ) {
          setMessages((prev) => [...prev, message]);
          scrollToBottom();
          
          // Mark as read if message is from contact
          if (message.senderId === contactId) {
            messageService.markMessagesAsRead(user._id, contactId);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      setLoading(true);
      const data = await messageService.getMessages(userId, contactId);
      
      if (data.success) {
        setMessages(data.messages || []);
        scrollToBottom();
        
        // Mark messages as read
        await messageService.markMessagesAsRead(userId, contactId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const messageData = {
        senderId: currentUser._id,
        receiverId: contactId,
        text: messageText,
      };

      // Send via socket for real-time delivery
      const socketSent = socketService.sendMessage(messageData);

      // Also send via API for persistence
      await messageService.sendMessage(
        currentUser._id,
        contactId,
        messageText
      );

      // Optimistically add message to UI
      if (!socketSent) {
        const newMessage = {
          ...messageData,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          read: false,
        };
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === currentUser?._id;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.theirBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myText : styles.theirText,
            ]}
          >
            {item.text}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#E9ECEF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
```

---

## 🔐 Authentication Setup

### Auth Store (`store/authStore.js`)

```javascript
// store/authStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import socketService from '../services/socket';

export const authStore = {
  // Login
  async login(email, password) {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Connect socket
        socketService.connect(user._id);
        
        return { success: true, user };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  },

  // Logout
  async logout() {
    try {
      // Disconnect socket
      socketService.disconnect();
      
      // Clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Check if logged in
  async isLoggedIn() {
    try {
      const token = await AsyncStorage.getItem('token');
      return !!token;
    } catch (error) {
      return false;
    }
  },
};
```

---

## 🎯 App.js Integration

```javascript
// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './services/socket';

import MessagesScreen from './screens/MessagesScreen';
import ChatScreen from './screens/ChatScreen';
import LoginScreen from './screens/LoginScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        setIsLoggedIn(true);
        
        // Connect socket
        socketService.connect(user._id);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                title: 'Messages',
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.contactName || 'Chat',
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#fff',
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 🔗 Integration with Property Viewing

### PropertyDetailsScreen with Contact Owner

```javascript
// screens/PropertyDetailsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react';
import { useNavigation } from '@react-navigation/native';

export default function PropertyDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { property } = route.params;

  const contactOwner = () => {
    // Check if owner info is populated
    if (property.postedBy && typeof property.postedBy === 'object') {
      navigation.navigate('Chat', {
        contactId: property.postedBy._id,
        contactName: property.postedBy.fullName || property.postedBy.username,
        contactPhoto: property.postedBy.profilePicture,
      });
    } else {
      alert('Owner information not available');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{property.name}</Text>
      <Text style={styles.description}>{property.description}</Text>
      
      {/* Owner Info */}
      {property.postedBy && (
        <View style={styles.ownerSection}>
          <Text style={styles.ownerLabel}>Property Owner:</Text>
          <Text style={styles.ownerName}>
            {property.postedBy.fullName || property.postedBy.username}
          </Text>
          <Text style={styles.ownerPhone}>
            {property.postedBy.phoneNumber || property.phoneNumber}
          </Text>
        </View>
      )}

      {/* Contact Button */}
      <TouchableOpacity
        style={styles.contactButton}
        onPress={contactOwner}
      >
        <Text style={styles.contactButtonText}>Contact Owner</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  ownerSection: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  ownerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  ownerPhone: {
    fontSize: 16,
    color: '#007AFF',
  },
  contactButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

---

## 🧪 Testing Guide

### 1. Test Socket Connection

```javascript
// Add to any screen for testing
useEffect(() => {
  const testSocket = async () => {
    const userJson = await AsyncStorage.getItem('user');
    const user = JSON.parse(userJson);
    
    socketService.connect(user._id);
    
    console.log('Socket connected:', socketService.isConnected());
  };
  
  testSocket();
}, []);
```

### 2. Test Message Sending

```javascript
// Test in ChatScreen
const testMessage = () => {
  socketService.sendMessage({
    senderId: currentUser._id,
    receiverId: contactId,
    text: 'Test message from mobile app',
  });
};
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Socket not connecting
**Symptom:** Messages not arriving in real-time

**Solutions:**
```javascript
// Check socket status
console.log('Socket connected:', socketService.isConnected());

// Manually reconnect
socketService.disconnect();
socketService.connect(userId);

// Check BASE_URL is correct
console.log('Connecting to:', BASE_URL);
```

---

### Issue 2: Messages not persisting
**Symptom:** Messages disappear after app restart

**Solution:** Make sure both socket AND API calls are made:
```javascript
// ✅ Correct: Both socket and API
socketService.sendMessage(messageData);
await messageService.sendMessage(senderId, receiverId, text);

// ❌ Wrong: Only socket (not persistent)
socketService.sendMessage(messageData);
```

---

### Issue 3: "Owner information not available"
**Symptom:** Can't contact owner from property details

**Solution:** Backend must populate owner data:
```javascript
// Check if owner is populated
console.log('Owner:', property.postedBy);

// Should be object, not just ID:
// ✅ { _id: '...', fullName: 'John', ... }
// ❌ '681b26b2c58b946b8d16dacf'
```

---

### Issue 4: Token expired
**Symptom:** 401 errors, logged out unexpectedly

**Solution:**
```javascript
// Add token refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear storage and redirect to login
      await AsyncStorage.clear();
      navigation.navigate('Login');
    }
    return Promise.reject(error);
  }
);
```

---

## 📱 iOS vs Android Considerations

### iOS Specific:
```javascript
// KeyboardAvoidingView
<KeyboardAvoidingView
  behavior="padding"
  keyboardVerticalOffset={90}
>
```

### Android Specific:
```javascript
// AndroidManifest.xml
<uses-permission android:name="android.permission.INTERNET" />

// KeyboardAvoidingView
<KeyboardAvoidingView
  behavior="height"
>
```

---

## 🎨 UI Libraries (Optional)

### Using react-native-gifted-chat

```bash
expo install react-native-gifted-chat
```

```javascript
import { GiftedChat } from 'react-native-gifted-chat';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);

  const onSend = useCallback((newMessages = []) => {
    const message = newMessages[0];
    
    socketService.sendMessage({
      senderId: currentUser._id,
      receiverId: contactId,
      text: message.text,
    });
    
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, newMessages)
    );
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={onSend}
      user={{
        _id: currentUser._id,
        name: currentUser.fullName,
        avatar: currentUser.profilePicture,
      }}
    />
  );
}
```

---

## 🚀 Production Checklist

- [ ] Update BASE_URL to production server
- [ ] Test socket connection on real devices
- [ ] Test on both iOS and Android
- [ ] Handle network errors gracefully
- [ ] Add loading states for all operations
- [ ] Implement pull-to-refresh for messages
- [ ] Add typing indicators (optional)
- [ ] Add message delivery status (optional)
- [ ] Test with slow network
- [ ] Test app backgrounding/foregrounding
- [ ] Add push notifications (optional)

---

## 📚 Additional Resources

### Backend Endpoints Reference:
- GET `/api/auth/users` - Get all users
- GET `/api/messages/:userId/:otherUserId` - Get messages
- POST `/api/messages` - Send message
- PUT `/api/messages/mark-read` - Mark as read

### Socket Events:
- `register` - Register user with socket
- `send-message` - Send message
- `receive-message` - Receive message
- `mark-read` - Mark messages as read
- `messages-read` - Messages read notification

---

**Last Updated:** October 14, 2025  
**Backend URL:** https://rentify-server-ge0f.onrender.com  
**Status:** ✅ Ready for Mobile Integration
