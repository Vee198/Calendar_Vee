import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

// ─── Modern status names ───
type TaskStatus = 'pending' | 'complete' | 'missed';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
  date: string; // YYYY-MM-DD
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  icon: '⏳', color: '#F59E0B', bg: '#FEF3C7' },
  complete: { label: 'Complete', icon: '✅', color: '#10B981', bg: '#D1FAE5' },
  missed:   { label: 'Missed',   icon: '❌', color: '#EF4444', bg: '#FEE2E2' },
};

const TASKS_STORAGE_KEY = 'calendarVee_tasks';

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatThaiDate = (dateStr: string): string => {
  const THAI_MONTHS: Record<string, string> = {
    '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.',
    '05': 'พ.ค.', '06': 'มิ.ย.', '07': 'ก.ค.', '08': 'ส.ค.',
    '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
  };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)} ${THAI_MONTHS[parts[1]] || parts[1]} ${parseInt(parts[0], 10) + 543}`;
};

// ─── Mini Donut for task progress ───
const TaskDonut = ({ tasks }: { tasks: Task[] }) => {
  const size = 160;
  const radius = size / 2 - 16;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    complete: tasks.filter(t => t.status === 'complete').length,
    missed: tasks.filter(t => t.status === 'missed').length,
  };
  const total = tasks.length;

  if (total === 0) {
    return (
      <View style={donutStyles.emptyContainer}>
        <Text style={donutStyles.emptyIcon}>📝</Text>
        <Text style={donutStyles.emptyText}>เพิ่ม Task แรกของวันกันเลย!</Text>
      </View>
    );
  }

  const segments: { color: string; pct: number }[] = [
    { color: STATUS_CONFIG.complete.color, pct: counts.complete / total },
    { color: STATUS_CONFIG.pending.color, pct: counts.pending / total },
    { color: STATUS_CONFIG.missed.color, pct: counts.missed / total },
  ].filter(s => s.pct > 0);

  let accumulated = 0;
  const arcs = segments.map(s => {
    const dashLength = s.pct * circumference;
    const offset = circumference - accumulated * circumference;
    accumulated += s.pct;
    return { ...s, dashLength, offset };
  });

  const completePct = total > 0 ? Math.round((counts.complete / total) * 100) : 0;

  return (
    <View style={donutStyles.wrapper}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={center} cy={center} r={radius}
              stroke={arc.color} strokeWidth={strokeWidth} fill="none"
              strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
        <SvgText x={center} y={center - 6} textAnchor="middle" fill={COLORS.text} fontSize="28" fontWeight="bold">
          {completePct}%
        </SvgText>
        <SvgText x={center} y={center + 16} textAnchor="middle" fill={COLORS.textSecondary} fontSize="11">
          Complete
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={donutStyles.legend}>
        {(['complete', 'pending', 'missed'] as TaskStatus[]).map(status => (
          <View key={status} style={donutStyles.legendItem}>
            <View style={[donutStyles.legendDot, { backgroundColor: STATUS_CONFIG[status].color }]} />
            <Text style={donutStyles.legendLabel}>
              {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
            </Text>
            <Text style={donutStyles.legendCount}>{counts[status]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const donutStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  legend: { marginTop: 12, width: '100%', paddingHorizontal: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendLabel: { fontSize: 13, color: COLORS.text, flex: 1 },
  legendCount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});

// ─── Main Screen ───
const TaskScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [refreshing, setRefreshing] = useState(false);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const all: Task[] = JSON.parse(raw);
        setTasks(all);
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
    }
  }, []);

  // Save tasks
  const saveTasks = useCallback(async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (e) {
      console.error('Error saving tasks:', e);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  // Filter tasks for selected date
  const todayTasks = tasks.filter(t => t.date === selectedDate);

  // Add task
  const addTask = useCallback(() => {
    const title = newTaskText.trim();
    if (!title) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status: 'pending',
      createdAt: new Date().toISOString(),
      date: selectedDate,
    };
    saveTasks([...tasks, newTask]);
    setNewTaskText('');
  }, [newTaskText, selectedDate, tasks, saveTasks]);

  // Cycle status: pending → complete → missed → pending
  const cycleStatus = useCallback((taskId: string) => {
    const order: TaskStatus[] = ['pending', 'complete', 'missed'];
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const idx = order.indexOf(t.status);
        const next = order[(idx + 1) % order.length];
        return { ...t, status: next };
      }
      return t;
    });
    saveTasks(updated);
  }, [tasks, saveTasks]);

  // Delete task
  const deleteTask = useCallback((taskId: string) => {
    Alert.alert('ลบ Task', 'ต้องการลบ Task นี้ใช่ไหม?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => saveTasks(tasks.filter(t => t.id !== taskId)),
      },
    ]);
  }, [tasks, saveTasks]);

  // Date navigation
  const changeDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const isToday = selectedDate === getTodayStr();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Task Board</Text>
        <Text style={styles.headerSubtitle}>จัดการงานประจำวัน</Text>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelectorRow}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(getTodayStr())}>
          <Text style={[styles.dateText, isToday && styles.dateTextToday]}>
            {isToday ? 'วันนี้' : ''} {formatThaiDate(selectedDate)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Progress Donut */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Daily Progress</Text>
          <TaskDonut tasks={todayTasks} />
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.quickStats}>
          {(['pending', 'complete', 'missed'] as TaskStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const count = todayTasks.filter(t => t.status === status).length;
            return (
              <View key={status} style={[styles.quickStatItem, { backgroundColor: cfg.bg }]}>
                <Text style={styles.quickStatIcon}>{cfg.icon}</Text>
                <Text style={[styles.quickStatNum, { color: cfg.color }]}>{count}</Text>
                <Text style={styles.quickStatLabel}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Task List */}
        <View style={styles.taskListSection}>
          <Text style={styles.sectionTitle}>
            Tasks ({todayTasks.length})
          </Text>

          {todayTasks.length === 0 && (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>ยังไม่มี task สำหรับวันนี้</Text>
              <Text style={styles.emptyListHint}>เพิ่ม task ด้านล่างได้เลย</Text>
            </View>
          )}

          {todayTasks.map(task => {
            const cfg = STATUS_CONFIG[task.status];
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskRow, { borderLeftColor: cfg.color }]}
                onPress={() => cycleStatus(task.id)}
                onLongPress={() => deleteTask(task.id)}
                activeOpacity={0.7}
              >
                {/* Status checkbox */}
                <View style={[styles.checkbox, { borderColor: cfg.color, backgroundColor: task.status === 'complete' ? cfg.color : 'transparent' }]}>
                  {task.status === 'complete' && <Text style={styles.checkmark}>✓</Text>}
                  {task.status === 'missed' && <Text style={styles.checkmarkMissed}>✕</Text>}
                </View>

                {/* Task title */}
                <Text style={[
                  styles.taskTitle,
                  task.status === 'complete' && styles.taskTitleDone,
                  task.status === 'missed' && styles.taskTitleMissed,
                ]}>
                  {task.title}
                </Text>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            แตะ = เปลี่ยนสถานะ (Pending → Complete → Missed){'\n'}
            กดค้าง = ลบ Task
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Task Bar */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="เพิ่ม Task ใหม่..."
          placeholderTextColor="#9CA3AF"
          value={newTaskText}
          onChangeText={setNewTaskText}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !newTaskText.trim() && styles.addBtnDisabled]}
          onPress={addTask}
          disabled={!newTaskText.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  // Header
  header: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13, color: '#93C5FD', marginTop: 2,
  },
  // Date selector
  dateSelectorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    gap: 20,
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  dateArrowText: { fontSize: 24, color: '#1E40AF', fontWeight: '600' },
  dateText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  dateTextToday: { color: '#1E40AF' },
  // Scroll
  scrollArea: { flex: 1 },
  // Chart card
  chartCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  chartCardTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4,
  },
  // Quick stats
  quickStats: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16,
  },
  quickStatItem: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  quickStatIcon: { fontSize: 20, marginBottom: 4 },
  quickStatNum: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  // Task list
  taskListSection: { paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12,
  },
  emptyList: { alignItems: 'center', paddingVertical: 30 },
  emptyListText: { fontSize: 15, color: COLORS.textSecondary },
  emptyListHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  // Task row
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: 12,
  },
  checkbox: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700' },
  checkmarkMissed: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  taskTitle: {
    flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through', color: '#9CA3AF',
  },
  taskTitleMissed: {
    color: '#EF4444', opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  // Tip card
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, padding: 12,
    backgroundColor: '#EFF6FF', borderRadius: 12, gap: 8,
  },
  tipIcon: { fontSize: 16 },
  tipText: { fontSize: 11, color: '#1E40AF', lineHeight: 18, flex: 1 },
  // Add bar
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  addInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: '#E5E7EB',
  },
  addBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },
  addBtnText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});

export default TaskScreen;
