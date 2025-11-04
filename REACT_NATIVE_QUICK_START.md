# 🚀 Quick Start - React Native Messages Integration

## 📦 Installation (1 minute)

```bash
npm install socket.io-client axios @react-native-async-storage/async-storage
```

---

## ⚡ Minimum Setup (5 minutes)

### 1. Create Socket Service
Copy `services/socket.js` from full guide

### 2. Create Message Service  
Copy `services/messageService.js` from full guide

### 3. Update BASE_URL
```javascript
// services/api.js
const BASE_URL = 'https://rentify-server-ge0f.onrender.com';
```

---

## 💬 Basic Chat Implementation

### Messages List Screen
```javascript
import { messageService } from '../services/messageService';

const MessagesScreen = () => {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const data = await messageService.getAllUsers();
    setContacts(data.users);
  };

  return (
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => openChat(item)}>
          <Text>{item.fullName}</Text>
        </TouchableOpacity>
      )}
    />
  );
};
```

### Chat Screen
```javascript
import socketService from '../services/socket';

const ChatScreen = ({ route }) => {
  const { contactId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Load messages
    loadMessages();
    
    // Listen for new messages
    socketService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });
  }, []);

  const loadMessages = async () => {
    const data = await messageService.getMessages(userId, contactId);
    setMessages(data.messages);
  };

  const sendMessage = async () => {
    socketService.sendMessage({
      senderId: userId,
      receiverId: contactId,
      text: text
    });
    
    await messageService.sendMessage(userId, contactId, text);
    setText('');
  };

  return (
    <View>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      <TextInput value={text} onChangeText={setText} />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
};
```

---

## 🔗 Contact Owner from Property

```javascript
const PropertyDetailsScreen = ({ property }) => {
  const navigation = useNavigation();

  const contactOwner = () => {
    if (property.postedBy) {
      navigation.navigate('Chat', {
        contactId: property.postedBy._id,
        contactName: property.postedBy.fullName,
      });
    }
  };

  return (
    <View>
      <Text>{property.name}</Text>
      <Text>Owner: {property.postedBy?.fullName}</Text>
      <Button title="Contact Owner" onPress={contactOwner} />
    </View>
  );
};
```

---

## 🎯 App.js Setup

```javascript
import { useEffect } from 'react';
import socketService from './services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  useEffect(() => {
    initSocket();
  }, []);

  const initSocket = async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      socketService.connect(user._id);
    }
  };

  return (
    <NavigationContainer>
      {/* Your navigation */}
    </NavigationContainer>
  );
}
```

---

## ✅ Testing Checklist

1. **Socket Connection**
   ```javascript
   console.log('Connected:', socketService.isConnected());
   ```

2. **Send Message**
   - Type and send message
   - Check if appears in chat
   - Refresh and check if persists

3. **Receive Message**
   - Send from another device/browser
   - Should appear instantly

4. **Contact Owner**
   - Click property
   - Click "Contact Owner"
   - Should open chat with owner

---

## 🐛 Quick Fixes

### Not Connecting?
```javascript
// Check URL
console.log('BASE_URL:', BASE_URL);

// Reconnect
socketService.disconnect();
socketService.connect(userId);
```

### Messages Not Saving?
Make sure to call BOTH:
```javascript
socketService.sendMessage(data);  // Real-time
await messageService.sendMessage(); // Persistence
```

### Owner Not Found?
Backend must populate:
```javascript
// ✅ Should be object
property.postedBy.fullName

// ❌ Not just ID
property.postedBy // '681b...'
```

---

## 📚 Full Documentation

See `REACT_NATIVE_EXPO_MESSAGES_GUIDE.md` for:
- Complete code examples
- Error handling
- Socket lifecycle management
- UI components
- Production checklist

---

**Backend URL:** https://rentify-server-ge0f.onrender.com  
**Socket Events:** register, send-message, receive-message  
**API Endpoints:** /api/messages, /api/auth/users
