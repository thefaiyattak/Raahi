import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from './AppIcon';
import { ChatMessage, UserProfile } from '../types';
import { getChatMessagesLocal, saveChatMessageLocal } from '../services/dbService';
import { addNotificationLocal } from '../services/notificationService';

interface InAppChatModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  recipientUid: string;
  recipientName: string;
  relatedPostId?: string;
  tripRoute?: string;
}

export const InAppChatModal: React.FC<InAppChatModalProps> = ({
  visible,
  onClose,
  currentUser,
  recipientUid,
  recipientName,
  relatedPostId,
  tripRoute,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && recipientUid) {
      loadMessages();
    }
  }, [visible, recipientUid, relatedPostId]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const list = await getChatMessagesLocal(currentUser.uid, recipientUid, relatedPostId);
      setMessages(list);
    } catch (e) {
      console.warn('Failed to load chat messages', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderUid: currentUser.uid,
      senderName: currentUser.fullName || 'User',
      recipientUid,
      recipientName,
      relatedPostId,
      text: textToSend,
      timestamp: Date.now(),
    };

    try {
      await saveChatMessageLocal(newMsg);
      setMessages((prev) => [...prev, newMsg]);

      // Push an in-app notification to recipient
      await addNotificationLocal({
        title: `💬 New message from ${currentUser.fullName || 'User'}`,
        message: textToSend,
        type: 'system',
        postId: relatedPostId,
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.warn('Failed to save message', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.chatSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {recipientName}
                </Text>
              </View>
              {tripRoute && (
                <Text style={styles.routeSubtitle} numberOfLines={1}>
                  📍 {tripRoute}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Icon name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Messages list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2F9A3C" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="chat-processing-outline" size={28} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>In-App Message</Text>
              <Text style={styles.emptySubtitle}>
                Send a secure in-app message to {recipientName} regarding this trip.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isMine = item.senderUid === currentUser.uid;
                const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View
                    style={[
                      styles.messageBubbleContainer,
                      isMine ? styles.myMessageContainer : styles.theirMessageContainer,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMine ? styles.myBubble : styles.theirBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMine ? styles.myMessageText : styles.theirMessageText,
                        ]}
                      >
                        {item.text}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isMine ? styles.myTimeText : styles.theirTimeText,
                        ]}
                      >
                        {timeStr}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Input Bar with Bottom Safe Padding */}
          <SafeAreaView style={styles.bottomSafeArea}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={`Message ${recipientName}...`}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: inputText.trim().length > 0 ? '#2F9A3C' : '#E5E7EB' },
                ]}
                disabled={!inputText.trim().length}
                onPress={handleSendMessage}
                activeOpacity={0.85}
              >
                <Icon
                  name="send"
                  size={18}
                  color={inputText.trim().length > 0 ? '#FFFFFF' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  chatSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    maxHeight: '88%',
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  routeSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: '#2F9A3C',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  theirMessageText: {
    color: '#1F2937',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  theirTimeText: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 90,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default InAppChatModal;
