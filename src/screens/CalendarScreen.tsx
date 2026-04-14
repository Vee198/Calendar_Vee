import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { theme } from '../constants/theme';

type ViewMode = 'month' | 'week' | 'list';

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: string;
  location?: string;
  status: string;
}

interface Holiday {
  date: string;
  name: string;
}

const { width } = Dimensions.get('window');
const DAYS_IN_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isAdmin, canEdit, userName } = useAuth();
  const { profileImage } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      const eventResponse = await api.getEvents({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      });
      setEvents((eventResponse as any)?.events || eventResponse || []);

      const holidayResponse = await api.getHolidays(currentDate.getFullYear());
      setHolidays((holidayResponse as any)?.holidays || holidayResponse || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  }, [loadEvents]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getThaiYearAndMonth = () => {
    const thaiYear = currentDate.getFullYear() + 543;
    const month = THAI_MONTHS[currentDate.getMonth()];
    return `${month} ${thaiYear}`;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      meeting: '#EF4444',
      training: '#F59E0B',
      event: '#10B981',
      holiday: '#EC4899',
      deadline: '#8B5CF6',
      other: '#6B7280',
      task: '#4ECDC4',
      personal: '#95E1D3',
    };
    return colorMap[category.toLowerCase()] || '#90CAF9';
  };

  // Helper: format Date to "YYYY-MM-DD" in LOCAL timezone (avoids UTC shift)
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper: extract local date string from ISO datetime string
  const eventToLocalDateStr = (isoStr: string) => {
    const d = new Date(isoStr);
    return toLocalDateStr(d);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getEventsForDate = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    return filteredEvents.filter((event) => eventToLocalDateStr(event.start_time) === dateStr);
  };

  const isHoliday = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    return holidays.some((h) => h.date === dateStr);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const renderMonthView = () => {
    const days = getDaysInMonth();
    const isToday = (date: Date | null) => {
      if (!date) return false;
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    return (
      <View style={styles.monthContainer}>
        {/* Day headers */}
        <View style={styles.weekDayHeader}>
          {DAYS_IN_WEEK.map((day) => (
            <Text key={day} style={styles.dayHeaderText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.calendarDay} />;
            }

            const dayEvents = getEventsForDate(date);
            const isTodayDate = isToday(date);
            const isHolidayDate = isHoliday(date);

            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[
                  styles.calendarDay,
                  isTodayDate && styles.todayDay,
                  isHolidayDate && styles.holidayDay,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayNumber, isTodayDate && styles.todayText]}>
                  {date.getDate()}
                </Text>
                <View style={styles.eventDotsContainer}>
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <View
                      key={i}
                      style={[
                        styles.eventDot,
                        { backgroundColor: getCategoryColor(event.category) },
                      ]}
                    />
                  ))}
                  {dayEvents.length > 3 && <Text style={styles.moreText}>+{dayEvents.length - 3}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day events */}
        {selectedDate && (
          <View style={styles.selectedDayEvents}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]}
            </Text>
            <FlatList
              scrollEnabled={false}
              data={getEventsForDate(selectedDate)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.eventItem}
                  onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                >
                  <View
                    style={[
                      styles.eventBadge,
                      { backgroundColor: getCategoryColor(item.category) },
                    ]}
                  />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(item.start_time).toLocaleTimeString('th-TH')}
                    </Text>
                  </View>
                  <Text style={styles.priorityBadge}>{item.priority}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.noEventsText}>No events for this day</Text>}
            />
          </View>
        )}
      </View>
    );
  };

  const renderWeekView = () => {
    const getWeekDays = () => {
      const curr = new Date(currentDate);
      const first = curr.getDate() - curr.getDay();
      const weekDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        weekDays.push(new Date(curr.setDate(first + i)));
      }
      return weekDays;
    };

    const weekDays = getWeekDays();
    const dayWidth = (width - 32) / 7;

    return (
      <View style={styles.weekContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => {
            const isToday =
              day.toDateString() === new Date().toDateString();
            return (
              <View key={day.toISOString()} style={{ width: dayWidth }}>
                <TouchableOpacity
                  style={[styles.weekDay, isToday && styles.weekDayToday]}
                  onPress={() => setSelectedDate(day)}
                >
                  <Text style={styles.weekDayNumber}>{day.getDate()}</Text>
                  <Text style={styles.weekDayName}>{DAYS_IN_WEEK[day.getDay()]}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Timeline view */}
        <FlatList
          scrollEnabled={false}
          data={filteredEvents.filter((e) => {
            const eventDate = new Date(e.start_time).toDateString();
            return weekDays.some((d) => d.toDateString() === eventDate);
          })}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.timelineEvent,
                { borderLeftColor: getCategoryColor(item.category) },
              ]}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            >
              <Text style={styles.timelineEventTitle}>{item.title}</Text>
              <Text style={styles.timelineEventTime}>
                {new Date(item.start_time).toLocaleTimeString('th-TH')}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.noEventsText}>No events this week</Text>}
        />
      </View>
    );
  };

  const renderListView = () => {
    const sortedEvents = [...filteredEvents].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return (
      <FlatList
        data={sortedEvents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listEventItem}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          >
            <View
              style={[
                styles.listEventBadge,
                { backgroundColor: getCategoryColor(item.category) },
              ]}
            />
            <View style={styles.listEventContent}>
              <Text style={styles.listEventTitle}>{item.title}</Text>
              <View style={styles.listEventMeta}>
                <Text style={styles.listEventTime}>
                  {new Date(item.start_time).toLocaleDateString('th-TH')}
                </Text>
                <Text style={styles.listEventLocation}>{item.location || 'No location'}</Text>
              </View>
            </View>
            <View style={styles.listEventRight}>
              <Text style={[styles.statusBadge, styles[`status${item.status}`]]}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.noEventsText}>No events found</Text>}
      />
    );
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Welcome Bar */}
      <View style={styles.welcomeBar}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.welcomeAvatar} />
        ) : (
          <View style={styles.welcomeAvatarPlaceholder}>
            <Text style={styles.welcomeAvatarEmoji}>👤</Text>
          </View>
        )}
        <Text style={styles.welcomeText}>
          สวัสดีค่ะ{userName ? ` ${userName}` : ''} 👋
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Text style={styles.navArrow}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthYearText}>{getThaiYearAndMonth()}</Text>

        <TouchableOpacity onPress={goToNextMonth}>
          <Text style={styles.navArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewModeTabs}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'month' && styles.activeViewModeTab]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.activeViewModeText]}>
            เดือน
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'week' && styles.activeViewModeTab]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.activeViewModeText]}>
            สัปดาห์
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'list' && styles.activeViewModeTab]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>
            📋 รายการ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหากิจกรรม..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {[
          { label: 'ทั้งหมด', value: 'all' },
          { label: 'ประชุม', value: 'meeting', color: '#EF4444' },
          { label: 'อบรม', value: 'training', color: '#F59E0B' },
          { label: 'กิจกรรม', value: 'event', color: '#10B981' },
          { label: 'วันหยุด', value: 'holiday', color: '#EC4899' },
          { label: 'กำหนดส่ง', value: 'deadline', color: '#8B5CF6' },
          { label: 'อื่นๆ', value: 'other', color: '#6B7280' },
        ].map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.filterChip, filterCategory === cat.value && styles.filterChipActive]}
            onPress={() => setFilterCategory(cat.value)}
          >
            {cat.color && <View style={[styles.filterDot, { backgroundColor: cat.color }]} />}
            <Text style={[styles.filterChipText, filterCategory === cat.value && styles.filterChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'list' && renderListView()}
      </ScrollView>

      {/* FAB for admin/member */}
      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EventForm', { eventId: null })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  welcomeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  welcomeAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarEmoji: { fontSize: 18 },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navArrow: {
    fontSize: 24,
    color: theme.colors.primary || '#1976D2',
    fontWeight: '700',
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  viewModeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
  },
  activeViewModeTab: {
    backgroundColor: theme.colors.primary || '#1976D2',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeViewModeText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  monthContainer: {
    flex: 1,
    padding: 16,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 4,
    justifyContent: 'flex-start',
  },
  todayDay: {
    backgroundColor: '#E3F2FD',
    borderColor: theme.colors.primary || '#1976D2',
    borderWidth: 2,
  },
  holidayDay: {
    backgroundColor: '#FFEBEE',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
  },
  todayText: {
    color: theme.colors.primary || '#1976D2',
  },
  eventDotsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreText: {
    fontSize: 8,
    color: '#999',
    marginLeft: 2,
  },
  selectedDayEvents: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: -16,
    marginBottom: -16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  eventBadge: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FFF3CD',
    color: '#856404',
    borderRadius: 4,
  },
  noEventsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  weekContainer: {
    flex: 1,
    padding: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F9F9F9',
  },
  weekDayToday: {
    backgroundColor: theme.colors.primary || '#1976D2',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  weekDayName: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  timelineEvent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderRadius: 6,
  },
  timelineEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  timelineEventTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  listEventBadge: {
    width: 6,
    height: 60,
    borderRadius: 3,
    marginRight: 12,
  },
  listEventContent: {
    flex: 1,
  },
  listEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  listEventMeta: {
    marginTop: 4,
  },
  listEventTime: {
    fontSize: 12,
    color: '#999',
  },
  listEventLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listEventRight: {
    marginLeft: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusscheduled: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  statuscompleted: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
  },
  statuscancelled: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary || '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    fontSize: 28,
    color: 'white',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  clearSearch: {
    fontSize: 16,
    color: '#999',
    paddingHorizontal: 8,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
});

export default CalendarScreen;
