import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const TASKS_STORAGE_KEY = 'calendarVee_tasks';
interface TaskItem { id: string; title: string; status: 'pending' | 'complete' | 'missed'; date: string; }

interface EventItem {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: string;
  status: string;
  location?: string;
}

interface StatsData {
  total: number;
  today: number;
  upcoming: number;
  completed: number;
  eventsByMonth: Array<{ month: string; count: number }>;
  byCategory: Array<{ name: string; count: number; color: string }>;
  byPriority: Array<{ priority: string; count: number; color: string; key: string }>;
}

const THAI_MONTHS: Record<string, string> = {
  '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.',
  '05': 'พ.ค.', '06': 'มิ.ย.', '07': 'ก.ค.', '08': 'ส.ค.',
  '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
};

const DashboardScreen: React.FC = () => {
  const { userName } = useAuth();
  const { profileImage } = useTheme();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailModal, setDetailModal] = useState<{ visible: boolean; title: string; events: EventItem[] }>({
    visible: false,
    title: '',
    events: [],
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);
  const screenWidth = Dimensions.get('window').width;

  const CATEGORY_MAP: Record<string, { name: string; color: string }> = {
    meeting:  { name: 'ประชุม',    color: '#3B82F6' },
    training: { name: 'อบรม',     color: '#8B5CF6' },
    event:    { name: 'กิจกรรม', color: '#10B981' },
    holiday:  { name: 'วันหยุด', color: '#EF4444' },
    deadline: { name: 'กำหนดส่ง', color: '#F59E0B' },
    other:    { name: 'อื่นๆ',    color: '#6B7280' },
  };

  const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    high:   { label: 'สูง',   color: '#EF4444' },
    normal: { label: 'ปกติ', color: '#3B82F6' },
    low:    { label: 'ต่ำ',  color: '#6B7280' },
  };

  const normalizeStats = (raw: any): StatsData => {
    const d = raw?.stats || raw || {};

    const rawCategories: any[] = Array.isArray(d.byCategory)
      ? d.byCategory
      : Array.isArray(d.by_category) ? d.by_category : [];

    const rawPriorities: any[] = Array.isArray(d.byPriority)
      ? d.byPriority
      : Array.isArray(d.by_priority) ? d.by_priority : [];

    const rawMonths: any[] = Array.isArray(d.eventsByMonth)
      ? d.eventsByMonth
      : Array.isArray(d.by_month) ? d.by_month : [];

    return {
      total: d.total ?? 0,
      today: d.today ?? 0,
      upcoming: d.upcoming ?? 0,
      completed: d.completed ?? 0,
      eventsByMonth: rawMonths.map(m => ({
        month: m.month || m.label || '',
        count: m.count ?? 0,
      })),
      byCategory: rawCategories.map(c => {
        const key = c.category || c.name || '';
        const meta = CATEGORY_MAP[key] || { name: key, color: '#6B7280' };
        return { name: meta.name, count: c.count ?? 0, color: meta.color };
      }),
      byPriority: rawPriorities.map(p => {
        const key = p.priority || '';
        const meta = PRIORITY_MAP[key] || { label: key, color: '#6B7280' };
        return { priority: meta.label, count: p.count ?? 0, color: meta.color, key };
      }),
    };
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStats();
      setStats(normalizeStats(data));
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(normalizeStats({}));
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.getStats();
      setStats(normalizeStats(data));
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchTodayTasks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const all: TaskItem[] = JSON.parse(raw);
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        setTodayTasks(all.filter(t => t.date === todayStr));
      }
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchTodayTasks();
    }, [fetchStats, fetchTodayTasks])
  );

  // ─── Card tap: load events filtered by type ───
  const onCardTap = async (type: 'total' | 'today' | 'upcoming' | 'completed') => {
    try {
      setDetailLoading(true);
      const allEvents = await api.getEvents({});
      const eventsList: EventItem[] = (allEvents as any)?.events || allEvents || [];
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      let filtered: EventItem[] = [];
      let title = '';

      switch (type) {
        case 'total':
          title = 'งานทั้งหมด';
          filtered = eventsList.filter(e => e.status !== 'cancelled');
          break;
        case 'today':
          title = 'งานวันนี้';
          filtered = eventsList.filter(e => {
            const d = new Date(e.start_time);
            const eStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return eStr === todayStr && e.status !== 'cancelled';
          });
          break;
        case 'upcoming':
          title = 'รอดำเนินการ';
          filtered = eventsList.filter(e => new Date(e.start_time) > now && e.status === 'scheduled');
          break;
        case 'completed':
          title = 'เสร็จแล้ว';
          filtered = eventsList.filter(e => e.status === 'completed');
          break;
      }
      filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setDetailModal({ visible: true, title, events: filtered });
    } catch (error) {
      console.error('Error loading card detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatEventDateTime = (iso: string) => {
    const d = new Date(iso);
    const day = d.getDate();
    const monthKey = String(d.getMonth() + 1).padStart(2, '0');
    const monthName = THAI_MONTHS[monthKey] || monthKey;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${monthName} ${h}:${m}`;
  };

  const getCategoryColor = (cat: string) => CATEGORY_MAP[cat]?.color || '#6B7280';
  const getCategoryName = (cat: string) => CATEGORY_MAP[cat]?.name || cat;

  // ─── Donut Chart Component ───
  const DonutChart = ({ data, size = 180, centerLabel = 'รายการ' }: { data: Array<{ label: string; count: number; color: string }>; size?: number; centerLabel?: string }) => {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) {
      return (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: COLORS.textSecondary }}>ยังไม่มีข้อมูล</Text>
        </View>
      );
    }

    const radius = size / 2 - 20;
    const strokeWidth = 30;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulated = 0;
    const segments = data.filter(d => d.count > 0).map((d) => {
      const pct = d.count / total;
      const dashLength = pct * circumference;
      const offset = circumference - accumulated * circumference;
      accumulated += pct;
      return { ...d, dashLength, offset, pct };
    });

    return (
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Segments */}
            {segments.map((seg, i) => (
              <Circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
              />
            ))}
          </G>
          {/* Center text */}
          <SvgText
            x={center}
            y={center - 8}
            textAnchor="middle"
            fill={COLORS.text}
            fontSize="24"
            fontWeight="bold"
          >
            {total}
          </SvgText>
          <SvgText
            x={center}
            y={center + 14}
            textAnchor="middle"
            fill={COLORS.textSecondary}
            fontSize="12"
          >
            {centerLabel}
          </SvgText>
        </Svg>

        {/* Legend */}
        <View style={styles.donutLegend}>
          {data.filter(d => d.count > 0).map((d, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel}>{d.label}</Text>
              <Text style={styles.legendCount}>{d.count}</Text>
              <Text style={styles.legendPct}>({Math.round((d.count / total) * 100)}%)</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>ไม่สามารถโหลดข้อมูลได้</Text>
      </View>
    );
  }

  const getSmartInsights = (s: StatsData): string[] => {
    const insights: string[] = [];
    if (s.total > 0) {
      const pct = Math.round((s.completed / s.total) * 100);
      if (pct >= 70) insights.push(`🎉 เยี่ยมมาก! เสร็จแล้ว ${pct}% ของงานทั้งหมด`);
      else if (pct > 0) insights.push(`✅ เสร็จแล้ว ${pct}% — ยังเหลืออีกนิดเดียว!`);
    }
    if (s.upcoming > 0) insights.push(`⏳ มีงานรอดำเนินการ ${s.upcoming} รายการ`);
    if (s.today > 0) insights.push(`📅 วันนี้มีกำหนดการ ${s.today} รายการ`);
    else insights.push('🌟 วันนี้ยังไม่มีกำหนดการ สบายๆ ได้เลย');
    if (s.byCategory.length > 0) {
      const top = [...s.byCategory].sort((a, b) => b.count - a.count)[0];
      if (top.count > 0) insights.push(`📊 หมวดที่มากสุด: "${top.name}" (${top.count} งาน)`);
    }
    const highPri = s.byPriority.find(p => p.priority === 'สูง');
    if (highPri && highPri.count > 0) insights.push(`🔴 งานความสำคัญสูง ${highPri.count} รายการ — อย่าลืมนะคะ!`);
    return insights.slice(0, 3);
  };

  const statCards = [
    { label: 'งานทั้งหมด', value: stats.total, color: COLORS.primary, icon: '📋', type: 'total' as const },
    { label: 'งานวันนี้', value: stats.today, color: COLORS.success, icon: '✅', type: 'today' as const },
    { label: 'รอดำเนินการ', value: stats.upcoming, color: COLORS.warning, icon: '⏳', type: 'upcoming' as const },
    { label: 'เสร็จแล้ว', value: stats.completed, color: COLORS.purple, icon: '🎉', type: 'completed' as const },
  ];

  // ─── Bar chart: format month labels as Thai ───
  const safeEventsByMonth = stats.eventsByMonth.length > 0
    ? stats.eventsByMonth
    : [{ month: '-', count: 0 }];

  const chartLabels = safeEventsByMonth.map(d => {
    // d.month is "YYYY-MM" format
    const parts = d.month.split('-');
    if (parts.length === 2) {
      return THAI_MONTHS[parts[1]] || d.month;
    }
    return d.month;
  });

  const chartData = {
    labels: chartLabels,
    datasets: [{ data: safeEventsByMonth.map(d => Math.max(d.count, 0)) }],
  };

  const insights = getSmartInsights(stats);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
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

      {/* Smart Insights Card */}
      {insights.length > 0 && (
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsIcon}>✨</Text>
            <Text style={styles.insightsTitle}>Smart Insights</Text>
          </View>
          {insights.map((insight, i) => (
            <Text key={i} style={styles.insightItem}>{insight}</Text>
          ))}
        </View>
      )}

      {/* Task Progress Card */}
      {todayTasks.length > 0 && (() => {
        const tTotal = todayTasks.length;
        const tComplete = todayTasks.filter(t => t.status === 'complete').length;
        const tPending = todayTasks.filter(t => t.status === 'pending').length;
        const tMissed = todayTasks.filter(t => t.status === 'missed').length;
        const pct = Math.round((tComplete / tTotal) * 100);
        return (
          <TouchableOpacity
            style={styles.taskProgressCard}
            onPress={() => navigation.navigate('Tasks' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.taskProgressHeader}>
              <Text style={styles.taskProgressIcon}>✅</Text>
              <Text style={styles.taskProgressTitle}>Task Progress วันนี้</Text>
              <Text style={styles.taskProgressPct}>{pct}%</Text>
            </View>
            {/* Progress bar */}
            <View style={styles.taskProgressBarBg}>
              {tComplete > 0 && (
                <View style={[styles.taskProgressBarSeg, { flex: tComplete, backgroundColor: '#10B981' }]} />
              )}
              {tPending > 0 && (
                <View style={[styles.taskProgressBarSeg, { flex: tPending, backgroundColor: '#F59E0B' }]} />
              )}
              {tMissed > 0 && (
                <View style={[styles.taskProgressBarSeg, { flex: tMissed, backgroundColor: '#EF4444' }]} />
              )}
            </View>
            <View style={styles.taskProgressLegend}>
              <Text style={[styles.taskProgressLegendItem, { color: '#10B981' }]}>✅ {tComplete} Complete</Text>
              <Text style={[styles.taskProgressLegendItem, { color: '#F59E0B' }]}>⏳ {tPending} Pending</Text>
              <Text style={[styles.taskProgressLegendItem, { color: '#EF4444' }]}>❌ {tMissed} Missed</Text>
            </View>
          </TouchableOpacity>
        );
      })()}

      {/* Main Content */}
      <View style={styles.contentPad}>

      {/* Stats Cards Grid — Tappable */}
      <View style={styles.cardsGrid}>
        {statCards.map((card, index) => (
          <View key={index} style={styles.cardWrapper}>
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: card.color }]}
              onPress={() => onCardTap(card.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.cardTapHint}>แตะเพื่อดูรายละเอียด</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Bar Chart Section */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>งานรายเดือน</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={screenWidth - 64}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundColor: COLORS.white,
              backgroundGradientFrom: COLORS.white,
              backgroundGradientTo: COLORS.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: () => '#374151',
              style: { borderRadius: 8 },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#E5E7EB',
                strokeWidth: 1,
              },
              barPercentage: 0.6,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>
      </View>

      {/* Category Donut Chart */}
      {stats.byCategory.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>งานตามหมวดหมู่</Text>
          <View style={styles.donutContainer}>
            <DonutChart data={stats.byCategory.map(c => ({ label: c.name, count: c.count, color: c.color }))} size={200} centerLabel="รายการ" />
          </View>
        </View>
      )}

      {/* Priority Donut Chart */}
      {stats.byPriority.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>งานตามลำดับความสำคัญ</Text>
          <View style={styles.donutContainer}>
            <DonutChart data={stats.byPriority.map(p => ({ label: p.priority, count: p.count, color: p.color }))} size={180} centerLabel="รายการ" />
          </View>
        </View>
      )}

      </View>{/* end contentPad */}

      {/* Detail Modal */}
      <Modal
        visible={detailModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModal(p => ({ ...p, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailModal.title}</Text>
              <TouchableOpacity onPress={() => setDetailModal(p => ({ ...p, visible: false }))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{detailModal.events.length} รายการ</Text>

            {detailLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={detailModal.events}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalEventRow}
                    onPress={() => {
                      setDetailModal(p => ({ ...p, visible: false }));
                      navigation.navigate('EventDetail', { eventId: item.id });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalEventDot, { backgroundColor: getCategoryColor(item.category) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalEventTitle}>{item.title}</Text>
                      <Text style={styles.modalEventMeta}>
                        {formatEventDateTime(item.start_time)} · {getCategoryName(item.category)}
                      </Text>
                    </View>
                    <Text style={styles.modalEventArrow}>›</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>ไม่มีรายการ</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcomeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  welcomeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  welcomeAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarEmoji: { fontSize: 20 },
  welcomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  insightsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#312E81',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  insightsIcon: { fontSize: 18 },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E0E7FF',
    letterSpacing: 0.5,
  },
  insightItem: {
    fontSize: 13,
    color: '#C7D2FE',
    lineHeight: 22,
    paddingLeft: 4,
  },
  contentPad: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardTapHint: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 6,
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  // Donut chart styles
  donutContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donutLegend: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  legendCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 4,
  },
  legendPct: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Task Progress Card
  taskProgressCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  taskProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  taskProgressIcon: { fontSize: 18 },
  taskProgressTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  taskProgressPct: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  taskProgressBarBg: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 10,
  },
  taskProgressBarSeg: {
    height: 10,
  },
  taskProgressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskProgressLegendItem: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 22,
    color: '#9CA3AF',
    paddingHorizontal: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modalEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalEventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  modalEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  modalEventMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalEventArrow: {
    fontSize: 22,
    color: '#D1D5DB',
    marginLeft: 8,
  },
});

export default DashboardScreen;
