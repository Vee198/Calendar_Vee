import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { COLORS } from '../constants/theme';

// Voice recording state
type VoiceState = 'idle' | 'recording' | 'processing';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

// น้องดีดี๊ — เลขา AI คนเดียว
const DIDI = {
  id: 'didi',
  name: 'น้องดีดี๊',
  emoji: '🤖',
  avatar: 'https://image2url.com/r2/default/files/1775393297742-52dbaaa8-e470-418c-b1c9-d0556eebc065.png',
  description: 'ผู้ช่วย AI อัจฉริยะ',
  color: '#6C63FF',
  welcomeText: 'สวัสดีค่ะ 👋 น้องดีดี๊ พร้อมช่วยเหลือแล้วนะคะ!\nบอกได้เลยค่ะ ว่าอยากเพิ่มนัด แก้ตาราง หรืออยากรู้อะไร',
};

// AI Quick Action Prompts
const AI_ACTIONS = [
  {
    id: 'brief',
    icon: '📋',
    title: 'Brief งานวันนี้',
    subtitle: 'สรุปงาน + ความเสี่ยง + เตรียมตัว',
    color: '#6C63FF',
    prompt: `ช่วย Brief งานวันนี้ให้หน่อยค่ะ ดังนี้:
1. สรุปว่าวันนี้มีงาน/นัดอะไรบ้าง (ตามลำดับเวลา)
2. ประเมินความเสี่ยงของแต่ละงาน เช่น ถ้ามีเดินทาง ให้เผื่อเวลารถติด/หาที่จอด
3. เตือนสิ่งที่ต้องเตรียมล่วงหน้า เช่น เติมน้ำมัน เอกสาร ของใช้ส่วนตัว
4. แนะนำลำดับการจัดการงานที่เหมาะสมที่สุด
5. ถ้ามีงานที่ชนกันหรือใกล้เกินไป ให้แจ้งเตือนด้วย`,
  },
  {
    id: 'weekly',
    icon: '📊',
    title: 'สรุปสัปดาห์',
    subtitle: 'รายงานผลงาน 7 วันที่ผ่านมา',
    color: '#3B82F6',
    prompt: `ช่วยสรุปสัปดาห์ที่ผ่านมาให้หน่อยค่ะ:
1. สรุปงาน/นัดทั้งหมดที่ทำไปใน 7 วันที่ผ่านมา
2. งานไหนเสร็จแล้ว งานไหนยังค้าง
3. วิเคราะห์ว่าสัปดาห์นี้ productive แค่ไหน
4. มีงานที่ถูกยกเลิกหรือเลื่อนไหม
5. แนะนำสิ่งที่ควรทำในสัปดาห์หน้าเพื่อให้ดีขึ้น`,
  },
  {
    id: 'free-time',
    icon: '🕐',
    title: 'แนะนำเวลาว่าง',
    subtitle: 'หาช่วงว่างสำหรับนัดใหม่',
    color: '#10B981',
    prompt: `ช่วยดูปฏิทินและแนะนำเวลาว่างให้หน่อยค่ะ:
1. วันนี้ยังมีช่วงเวลาว่างไหม ช่วงไหนบ้าง
2. พรุ่งนี้มีช่วงเวลาว่างไหม
3. สัปดาห์นี้วันไหนว่างมากที่สุด เหมาะจัดนัดใหม่
4. ถ้าจะจัดประชุม 1 ชั่วโมง แนะนำช่วงเวลาที่ดีที่สุด
5. ระบุช่วงเวลาที่ไม่แนะนำด้วย (ช่วงที่นัดแน่นเกินไป)`,
  },
  {
    id: 'travel',
    icon: '🚗',
    title: 'เตือนก่อนออกเดินทาง',
    subtitle: 'เวลาออก + เผื่อรถติด + เตรียมตัว',
    color: '#F59E0B',
    prompt: `ช่วยวิเคราะห์การเดินทางสำหรับนัดถัดไปค่ะ:
1. นัดถัดไปคืออะไร อยู่ที่ไหน เวลาเท่าไร
2. ควรออกจากบ้านกี่โมง (เผื่อเวลารถติด 30-45 นาที)
3. เส้นทางมีจุดไหนที่มักรถติดไหม
4. ต้องเตรียมอะไรก่อนออก เช่น เติมน้ำมัน ชาร์จโทรศัพท์ เอกสาร
5. ถ้าเดินทางไกล แนะนำจุดพักระหว่างทาง
6. สภาพอากาศวันนี้เป็นอย่างไร ควรเตรียมร่มไหม`,
  },
  {
    id: 'tomorrow',
    icon: '🌅',
    title: 'เตรียมตัวพรุ่งนี้',
    subtitle: 'ดูงานพรุ่งนี้ล่วงหน้า',
    color: '#8B5CF6',
    prompt: `ช่วยเตรียมตัวสำหรับวันพรุ่งนี้ค่ะ:
1. พรุ่งนี้มีนัดอะไรบ้าง เรียงตามเวลา
2. มีงานที่ต้องเตรียมล่วงหน้าตั้งแต่คืนนี้ไหม
3. ควรตั้งนาฬิกาปลุกกี่โมง (คำนวณจากนัดแรก)
4. มีอะไรที่ต้องเตรียมของไปด้วยไหม
5. เตือนเรื่องแต่งกาย ถ้ามีงานที่ต้อง formal`,
  },
  {
    id: 'urgent',
    icon: '🔥',
    title: 'งานด่วน & Deadline',
    subtitle: 'งานที่ใกล้ถึง deadline',
    color: '#EF4444',
    prompt: `ช่วยเช็คงานด่วนและ deadline ที่ใกล้ถึงค่ะ:
1. มีงานด่วน (priority สูง) อะไรบ้างที่ยังไม่เสร็จ
2. Deadline ที่ใกล้ที่สุดคืออะไร เหลือเวลาอีกเท่าไร
3. งานไหนที่ควรทำก่อน (จัดลำดับความสำคัญ)
4. มีงานไหนที่เลยกำหนดแล้วยังไม่ได้ทำไหม
5. แนะนำแผนจัดการงานด่วนให้เหมาะสม`,
  },
];

const AISecretaryScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [checkingAI, setCheckingAI] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  // Pulse animation for recording
  useEffect(() => {
    if (voiceState === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Check AI status on mount
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        setCheckingAI(true);
        const status = await api.getAIStatus();
        setAiEnabled(status.enabled);
      } catch {
        setAiEnabled(false);
      } finally {
        setCheckingAI(false);
      }
    };
    checkAIStatus();
  }, []);

  // Welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      text: DIDI.welcomeText,
      isUser: false,
    }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── sendMessage ต้องอยู่ก่อน handleVoicePress ───
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !aiEnabled || loading) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, text, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setShowActions(false);
    setLoading(true);
    try {
      const response = await api.chatWithAI(text, DIDI.id);
      let replyText = response.reply || response.message || 'ขอโทษค่ะ ไม่มีคำตอบในขณะนี้';
      if (response.event_created) {
        const ev = response.event_created;
        const dateStr = ev.start_time
          ? new Date(ev.start_time).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
          : '';
        replyText += `\n\n✅ เพิ่มในปฏิทินแล้วค่ะ\n📌 ${ev.title}\n🕐 ${dateStr}`;
      }
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        text: replyText,
        isUser: false,
      }]);
      scrollToBottom();
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        text: `ขออภัยค่ะ เกิดข้อผิดพลาด: ${error?.message || 'Unknown error'}\nกรุณาลองใหม่ หรือตรวจสอบ API Key ในหน้า Settings`,
        isUser: false,
      }]);
    } finally {
      setLoading(false);
    }
  }, [aiEnabled, loading, scrollToBottom]);

  // ─── Voice Recording with Whisper STT ───
  const handleVoicePress = useCallback(async () => {
    if (voiceState === 'recording') {
      // ── Stop recording ──
      setVoiceState('processing');
      let step = 'init';
      let uri: string | null = null;
      try {
        step = 'get_recording_ref';
        const recording = recordingRef.current;
        if (!recording) {
          Alert.alert('Debug', 'ไม่พบ recording ref (step: ' + step + ')');
          return;
        }

        step = 'stop_recording';
        await recording.stopAndUnloadAsync();

        step = 'get_uri';
        uri = recording.getURI();
        recordingRef.current = null;

        if (!uri) {
          Alert.alert('Debug', 'ไม่ได้ URI ของไฟล์เสียง (step: ' + step + ')');
          return;
        }

        step = 'get_api_key';
        const openaiKey = await AsyncStorage.getItem('openai_api_key');

        if (!openaiKey) {
          Alert.alert(
            'ตั้งค่า Voice',
            'ต้องใส่ OpenAI API Key ใน Settings เพื่อใช้ Speech-to-Text\n\n(ใช้ Whisper API สำหรับแปลงเสียงภาษาไทย)',
            [{ text: 'ตกลง' }]
          );
          return;
        }

        step = 'build_formdata';
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as any);
        formData.append('model', 'whisper-1');
        formData.append('language', 'th');

        step = 'fetch_whisper';
        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            Accept: 'application/json',
          },
          body: formData as any,
        });

        step = 'parse_response';
        const rawText = await whisperRes.text();

        if (!whisperRes.ok) {
          Alert.alert(
            'Whisper API Error',
            `Status: ${whisperRes.status}\n\n${rawText.slice(0, 400)}`
          );
          return;
        }

        step = 'parse_json';
        let whisperData: any = {};
        try {
          whisperData = JSON.parse(rawText);
        } catch (parseErr) {
          Alert.alert('Debug', 'Parse JSON ล้มเหลว:\n' + rawText.slice(0, 300));
          return;
        }

        const transcript = (whisperData.text || '').trim();

        if (!transcript) {
          Alert.alert('ไม่ได้ยินเสียง', 'ลองพูดดังๆ อีกครั้งนะคะ');
          return;
        }

        step = 'send_to_ai';
        // Send transcript to AI
        sendMessage(`[Voice] ${transcript}`);
      } catch (err: any) {
        console.error('Voice error at step:', step, err);
        Alert.alert(
          'เกิดข้อผิดพลาด (step: ' + step + ')',
          err?.message || err?.toString() || 'ไม่สามารถแปลงเสียงได้'
        );
      } finally {
        // ALWAYS reset voice state and clean up
        setVoiceState('idle');
        if (uri) {
          try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
        }
      }
      return;
    }

    // ── Start recording ──
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('ไม่ได้รับอนุญาต', 'กรุณาเปิดสิทธิ์ไมโครโฟนในการตั้งค่า');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setVoiceState('recording');
    } catch (err: any) {
      console.error('Recording start error:', err);
      Alert.alert('ไม่สามารถอัดเสียงได้', err?.message || 'Unknown error');
      setVoiceState('idle');
    }
  }, [voiceState, sendMessage]);

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  const handleAction = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  if (checkingAI) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!aiEnabled) {
    return (
      <View style={styles.center}>
        <Text style={styles.disabledIcon}>🤖</Text>
        <Text style={styles.disabledTitle}>AI Premium ยังไม่ได้เปิดใช้งาน</Text>
        <Text style={styles.disabledText}>
          ไปที่ Settings → AI Premium{'\n'}แล้วใส่ Claude API Key ให้เรียบร้อยค่ะ
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Image source={{ uri: DIDI.avatar }} style={styles.headerAvatarImg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{DIDI.name}</Text>
          <View style={styles.onlineDot}>
            <View style={styles.dotGreen} />
            <Text style={styles.onlineText}>พร้อมให้บริการ</Text>
          </View>
        </View>
        {/* Toggle action panel */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setShowActions(!showActions)}
        >
          <Text style={styles.menuBtnText}>{showActions ? '💬' : '⚡'}</Text>
        </TouchableOpacity>
      </View>

      {/* AI Quick Actions Panel */}
      {showActions && !loading && (
        <View style={styles.actionsPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
            {AI_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { borderTopColor: action.color }]}
                onPress={() => handleAction(action.prompt)}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={2}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatContent}
        style={styles.chatList}
        renderItem={({ item }) => (
          <View style={[
            styles.msgRow,
            item.isUser ? styles.msgRowUser : styles.msgRowAI,
          ]}>
            {!item.isUser && (
              <View style={styles.aiBubbleAvatar}>
                <Image source={{ uri: DIDI.avatar }} style={styles.avatarImage} />
              </View>
            )}
            <View style={[
              styles.bubble,
              item.isUser ? styles.bubbleUser : styles.bubbleAI,
            ]}>
              <Text style={[styles.bubbleText, item.isUser && styles.bubbleTextUser]}>
                {item.text}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.aiBubbleAvatar}>
            <Image source={{ uri: DIDI.avatar }} style={styles.avatarImage} />
          </View>
          <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
            <Text style={styles.typingText}>กำลังพิมพ์...</Text>
          </View>
        </View>
      )}

      {/* Suggestion chips */}
      {messages.length <= 1 && !loading && (
        <View style={styles.suggestions}>
          {[
            'วันนี้มีงานอะไรบ้าง?',
            'เพิ่มการประชุม',
            'งานด่วนมีอะไร?',
          ].map(s => (
            <TouchableOpacity
              key={s}
              style={styles.chip}
              onPress={() => { setInputText(s); }}
            >
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Voice Recording Overlay */}
      {voiceState !== 'idle' && (
        <View style={styles.voiceOverlay}>
          <Animated.View style={[styles.voicePulse, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.voiceCircle}>
              <Text style={styles.voiceIcon}>
                {voiceState === 'recording' ? '🎙️' : '⏳'}
              </Text>
            </View>
          </Animated.View>
          <Text style={styles.voiceText}>
            {voiceState === 'recording' ? 'กำลังฟัง... พูดเสร็จแล้วกดหยุด' : 'กำลังแปลงเสียงเป็นข้อความ...'}
          </Text>
          {voiceState === 'recording' && (
            <TouchableOpacity style={styles.voiceStopBtn} onPress={handleVoicePress}>
              <Text style={styles.voiceStopText}>หยุด</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        {/* Mic button */}
        <TouchableOpacity
          style={[styles.micBtn, voiceState === 'recording' && styles.micBtnActive]}
          onPress={handleVoicePress}
          disabled={loading}
        >
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="พิมพ์ หรือ กดไมค์พูด..."
          placeholderTextColor={COLORS.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!loading && voiceState === 'idle'}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendIcon}>✈️</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8F9FA', paddingHorizontal: 24,
  },
  disabledIcon: { fontSize: 64, marginBottom: 16 },
  disabledTitle: {
    fontSize: 18, fontWeight: 'bold', color: COLORS.text,
    marginBottom: 8, textAlign: 'center',
  },
  disabledText: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
    gap: 12,
  },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE9FF', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  onlineDot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText: { fontSize: 12, color: '#22C55E', fontWeight: '500' },
  menuBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  menuBtnText: { fontSize: 20 },
  // Actions Panel
  actionsPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
    paddingVertical: 12,
  },
  actionsScroll: {
    paddingHorizontal: 16, gap: 10,
  },
  actionCard: {
    width: 130, backgroundColor: '#fff',
    borderRadius: 12, padding: 12,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  actionSubtitle: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 14 },
  // Chat
  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingVertical: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start', gap: 8 },
  aiBubbleAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE9FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: {
    width: 32, height: 32, borderRadius: 16,
  },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#6C63FF', borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  typingRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingBottom: 6,
  },
  typingBubble: { paddingVertical: 8 },
  typingText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  // Suggestions
  suggestions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  chip: {
    backgroundColor: '#EDE9FF', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#C4B5FD',
  },
  chipText: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EBEBEB',
  },
  input: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, maxHeight: 100,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.textSecondary, opacity: 0.5 },
  sendIcon: { fontSize: 18 },
  // Mic button
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  micBtnActive: {
    backgroundColor: '#FEE2E2', borderColor: '#EF4444',
  },
  micIcon: { fontSize: 20 },
  // Voice overlay
  voiceOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  voicePulse: {
    marginBottom: 24,
  },
  voiceCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  voiceIcon: { fontSize: 44 },
  voiceText: {
    color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 20,
  },
  voiceStopBtn: {
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  voiceStopText: {
    fontSize: 16, fontWeight: '700', color: '#EF4444',
  },
});

export default AISecretaryScreen;
