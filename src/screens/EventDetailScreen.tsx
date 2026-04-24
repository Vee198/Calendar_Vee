import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { theme, COLORS } from '../constants/theme';

interface EventDetail {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: string;
  status: string;
  notify_line?: boolean;
  notify_email?: boolean;
  recurrence?: string;
  notes?: string;
}

const EventDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const { canEdit } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.getEvent(eventId);
      // Backend wraps response: { event: {...} }
      const eventData = (response as any)?.event || response;
      setEvent(eventData);
    } catch (error) {
      console.error('Failed to load event:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      meeting: '#FF6B6B',
      task: '#4ECDC4',
      deadline: '#FFE66D',
      personal: '#95E1D3',
      default: '#90CAF9',
    };
    return colorMap[category.toLowerCase()] || colorMap.default;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: { [key: string]: string } = {
      high: '#FF6B6B',
      medium: '#FFA500',
      low: '#4ECDC4',
      default: '#90CAF9',
    };
    return colorMap[priority.toLowerCase()] || colorMap.default;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      scheduled: COLORS.primaryLight,
      completed: COLORS.success,
      cancelled: COLORS.danger,
      default: COLORS.textSecondary,
    };
    return colorMap[status.toLowerCase()] || colorMap.default;
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    const thaiDate = date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const time = date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date: thaiDate, time };
  };

  const handleEdit = () => {
    navigation.navigate('EventForm', { eventId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => deleteEvent(),
          style: 'destructive',
        },
      ]
    );
  };

  const deleteEvent = async () => {
    try {
      setDeleting(true);
      await api.deleteEvent(eventId);
      Alert.alert('Success', 'Event deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to delete event:', error);
      Alert.alert('Error', 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    );
  }

  const startDateTime = formatDateTime(event.start_time);
  const endDateTime = formatDateTime(event.end_time);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        {canEdit && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
              <Text style={styles.headerButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: getCategoryColor(event.category) },
              ]}
            >
              <Text style={styles.badgeText}>{event.category}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getPriorityColor(event.priority) },
              ]}
            >
              <Text style={styles.badgeText}>{event.priority}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getStatusColor(event.status) },
              ]}
            >
              <Text style={styles.badgeText}>{event.status}</Text>
            </View>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Date & Time</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Start:</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>{startDateTime.date}</Text>
              <Text style={styles.infoText}>{startDateTime.time}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>End:</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>{endDateTime.date}</Text>
              <Text style={styles.infoText}>{endDateTime.time}</Text>
            </View>
          </View>
        </View>

        {/* Location */}
        {event.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          <View style={styles.notificationRow}>
            <View
              style={[
                styles.notificationItem,
                event.notify_line && styles.notificationItemActive,
              ]}
            >
              <Text style={styles.notificationLabel}>Line</Text>
              <Text style={styles.notificationCheck}>{event.notify_line ? '✓' : '✗'}</Text>
            </View>
            <View
              style={[
                styles.notificationItem,
                event.notify_email && styles.notificationItemActive,
              ]}
            >
              <Text style={styles.notificationLabel}>Email</Text>
              <Text style={styles.notificationCheck}>{event.notify_email ? '✓' : '✗'}</Text>
            </View>
          </View>
        </View>

        {/* Recurrence */}
        {event.recurrence && event.recurrence !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔁 Recurrence</Text>
            <Text style={styles.infoText}>{event.recurrence}</Text>
          </View>
        )}

        {/* Notes */}
        {event.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Info</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Event ID:</Text>
            <Text style={styles.metaValue}>{event.id}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  headerButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleSection: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 6,
    padding: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  notificationItemActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: COLORS.success,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  notificationCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  notesBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
});

export default EventDetailScreen;
