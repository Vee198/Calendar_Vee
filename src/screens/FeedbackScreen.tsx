import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { feedbackService, FeedbackEntry } from '../services/feedback';
import { COLORS } from '../constants/theme';

const CATEGORIES = [
  { value: 'bug', label: 'แจ้งปัญหา', icon: '🐛' },
  { value: 'feature', label: 'แนะนำฟีเจอร์', icon: '💡' },
  { value: 'improve', label: 'ปรับปรุง', icon: '🔧' },
  { value: 'praise', label: 'ชื่นชม', icon: '❤️' },
  { value: 'other', label: 'อื่นๆ', icon: '💬' },
];

const RATINGS = [1, 2, 3, 4, 5];

type TabMode = 'write' | 'history';

const FeedbackScreen: React.FC = () => {
  const { userName } = useAuth();

  // Tab state
  const [tab, setTab] = useState<TabMode>('write');

  // Form state
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History state
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const entries = await feedbackService.getAll();
      setFeedbackList(entries);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab, loadHistory]);

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('กรุณาเลือกหมวดหมู่');
      return;
    }
    if (!rating) {
      Alert.alert('กรุณาให้คะแนน');
      return;
    }
    if (!message.trim()) {
      Alert.alert('กรุณาพิมพ์ข้อความ');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.submit({
        username: userName || 'Anonymous',
        category,
        rating,
        message: message.trim(),
      });

      Alert.alert('ส่งสำเร็จ!', 'ขอบคุณสำหรับ Feedback ของคุณ', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Reset form
            setCategory('');
            setRating(0);
            setMessage('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่ง Feedback ได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const filePath = feedbackService.getFilePath();
      await Share.share({
        title: 'Feedback Log - Calendar Vee',
        url: filePath,
        message: 'Feedback Log จาก Calendar Vee',
      });
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งออกไฟล์ได้');
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear() + 543; // Buddhist year
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return isoString;
    }
  };

  const getCategoryInfo = (value: string) => {
    return CATEGORIES.find((c) => c.value === value) || CATEGORIES[4];
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'write' && styles.tabButtonActive]}
          onPress={() => setTab('write')}
        >
          <Text style={[styles.tabText, tab === 'write' && styles.tabTextActive]}>
            ✍️ เขียน Feedback
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            📋 ประวัติ ({feedbackList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* === WRITE TAB === */}
      {tab === 'write' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>หมวดหมู่</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    category === cat.value && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === cat.value && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ให้คะแนนแอป</Text>
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.starButton}
                  onPress={() => setRating(r)}
                >
                  <Text style={[styles.star, r <= rating && styles.starFilled]}>
                    {r <= rating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
              {rating > 0 && (
                <Text style={styles.ratingLabel}>
                  {rating === 1
                    ? 'แย่'
                    : rating === 2
                    ? 'พอใช้'
                    : rating === 3
                    ? 'ปานกลาง'
                    : rating === 4
                    ? 'ดี'
                    : 'ดีมาก!'}
                </Text>
              )}
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ข้อความ</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="พิมพ์ Feedback ของคุณที่นี่..."
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{message.length}/1000</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!category || !rating || !message.trim()) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !category || !rating || !message.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>📤 ส่ง Feedback</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* === HISTORY TAB === */}
      {tab === 'history' && (
        <View style={{ flex: 1 }}>
          {/* Export button */}
          {feedbackList.length > 0 && (
            <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
              <Text style={styles.exportButtonText}>📁 ส่งออก CSV</Text>
            </TouchableOpacity>
          )}

          {loadingHistory ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : feedbackList.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>ยังไม่มี Feedback</Text>
              <Text style={styles.emptySubtext}>เขียน Feedback แรกของคุณเลย!</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.historyList}>
              {feedbackList.map((item) => {
                const catInfo = getCategoryInfo(item.category);
                return (
                  <View key={item.id} style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <View style={styles.feedbackMeta}>
                        <Text style={styles.feedbackCategoryBadge}>
                          {catInfo.icon} {catInfo.label}
                        </Text>
                        <Text style={styles.feedbackStars}>
                          {'★'.repeat(item.rating)}
                          {'☆'.repeat(5 - item.rating)}
                        </Text>
                      </View>
                      <Text style={styles.feedbackDate}>{formatDate(item.timestamp)}</Text>
                    </View>
                    <Text style={styles.feedbackMessage}>{item.message}</Text>
                    <Text style={styles.feedbackUser}>— {item.username}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // === Tab Bar ===
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // === Write Tab ===
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },

  // Category
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 36,
    color: '#CBD5E1',
  },
  starFilled: {
    color: '#F59E0B',
  },
  ratingLabel: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Message
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Submit
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // === History Tab ===
  exportButton: {
    alignSelf: 'flex-end',
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  historyList: {
    padding: 12,
    paddingBottom: 40,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackCategoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  feedbackStars: {
    fontSize: 14,
    color: '#F59E0B',
  },
  feedbackDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackUser: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'right',
  },
});

export default FeedbackScreen;
