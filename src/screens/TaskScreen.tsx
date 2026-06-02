import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  Modal,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText, Path, Rect, Line } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  KanbanTask,
  TaskStatus,
  TaskPriority,
  GamificationProfile,
  Badge,
  tasksApi,
  gamificationApi,
  STATUS_CONFIG_KANBAN,
  PRIORITY_CONFIG,
  LEVEL_CONFIG,
  BADGE_CONFIG,
  getLevelProgress,
  getNextLevelXp,
  Level,
} from '../services/gamification';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH - 32;

// ─── XP Toast Component ───
const XpToast = ({ xp, visible }: { xp: number; visible: boolean }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && xp > 0) {
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, xp]);

  if (!visible || xp <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.xpToast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <Text style={styles.xpToastText}>+{xp} XP</Text>
    </Animated.View>
  );
};

// ─── Level Progress Bar ───
const LevelProgressBar = ({ profile }: { profile: GamificationProfile | null }) => {
  if (!profile) return null;
  const levelInfo = LEVEL_CONFIG[profile.level as Level] || LEVEL_CONFIG.rookie;
  const progress = getLevelProgress(profile.total_xp, profile.level as Level);
  const nextXp = getNextLevelXp(profile.level as Level);

  return (
    <View style={styles.levelBar}>
      <View style={styles.levelBarHeader}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelIcon}>{levelInfo.icon}</Text>
          <Text style={[styles.levelName, { color: levelInfo.color }]}>{levelInfo.labelTh}</Text>
        </View>
        <View style={styles.xpDisplay}>
          <Text style={styles.xpText}>{profile.total_xp} XP</Text>
          {profile.level !== 'master' && (
            <Text style={styles.xpNextText}>/ {nextXp}</Text>
          )}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: levelInfo.color }]} />
      </View>

      <View style={styles.levelBarFooter}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{profile.current_streak} วันติดต่อกัน</Text>
        </View>
        {profile.longest_streak > 0 && (
          <Text style={styles.longestStreak}>สูงสุด: {profile.longest_streak}</Text>
        )}
      </View>
    </View>
  );
};

// ─── Kanban Column ───
const KanbanColumn = ({
  status,
  tasks,
  onMoveTask,
  onDeleteTask,
  onEditTask,
}: {
  status: TaskStatus;
  tasks: KanbanTask[];
  onMoveTask: (taskId: number, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: number) => void;
  onEditTask: (task: KanbanTask) => void;
}) => {
  const cfg = STATUS_CONFIG_KANBAN[status];
  const statusFlow: Record<TaskStatus, TaskStatus[]> = {
    new: ['in_progress'],
    in_progress: ['done', 'new'],
    done: ['in_progress'],
  };
  const moveOptions = statusFlow[status];

  return (
    <View style={styles.kanbanColumn}>
      {/* Column Header */}
      <View style={[styles.columnHeader, { borderBottomColor: cfg.color }]}>
        <Text style={styles.columnIcon}>{cfg.icon}</Text>
        <Text style={[styles.columnTitle, { color: cfg.color }]}>{cfg.labelTh}</Text>
        <View style={[styles.columnCount, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.columnCountText, { color: cfg.color }]}>{tasks.length}</Text>
        </View>
      </View>

      {/* Task Cards */}
      {tasks.length === 0 && (
        <View style={styles.emptyColumn}>
          <Text style={styles.emptyColumnText}>ว่าง</Text>
        </View>
      )}

      {tasks.map(task => {
        const prCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && status !== 'done';

        return (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, isOverdue && styles.taskCardOverdue]}
            onPress={() => onEditTask(task)}
            onLongPress={() => onDeleteTask(task.id)}
            activeOpacity={0.7}
          >
            {/* Priority & Deadline Row */}
            <View style={styles.taskCardTop}>
              <View style={[styles.priorityDot, { backgroundColor: prCfg.color }]} />
              <Text style={[styles.priorityLabel, { color: prCfg.color }]}>{prCfg.label}</Text>
              {task.deadline && (
                <Text style={[styles.deadlineText, isOverdue && styles.deadlineOverdue]}>
                  {isOverdue ? '⚠️ ' : '📅 '}
                  {formatShortDate(task.deadline)}
                </Text>
              )}
            </View>

            {/* Title */}
            <Text style={[styles.taskCardTitle, status === 'done' && styles.taskCardTitleDone]} numberOfLines={2}>
              {task.title}
            </Text>

            {/* XP & Move Buttons */}
            <View style={styles.taskCardBottom}>
              {task.xp_awarded > 0 && status === 'done' && (
                <Text style={styles.xpEarned}>+{task.xp_awarded} XP</Text>
              )}
              <View style={styles.moveButtons}>
                {moveOptions.map(targetStatus => {
                  const targetCfg = STATUS_CONFIG_KANBAN[targetStatus];
                  return (
                    <TouchableOpacity
                      key={targetStatus}
                      style={[styles.moveBtn, { backgroundColor: targetCfg.bg }]}
                      onPress={() => onMoveTask(task.id, targetStatus)}
                    >
                      <Text style={[styles.moveBtnText, { color: targetCfg.color }]}>
                        {targetStatus === 'done' ? '✓ Done' :
                         targetStatus === 'in_progress' ? '▶ ทำ' :
                         '↩ กลับ'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Date helpers ───
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Add Task Modal ───
const AddTaskModal = ({
  visible,
  onClose,
  onSubmit,
  editingTask,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; priority: TaskPriority; deadline: string }) => void;
  editingTask: KanbanTask | null;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [deadlineText, setDeadlineText] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setDeadlineText(editingTask.deadline ? editingTask.deadline.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDeadlineText('');
    }
  }, [editingTask, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingTask ? 'แก้ไข Task' : 'เพิ่ม Task ใหม่'}</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="ชื่อ Task *"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.modalInput, { height: 80 }]}
            placeholder="รายละเอียด (ไม่บังคับ)"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Priority Selector */}
          <Text style={styles.modalLabel}>ความสำคัญ</Text>
          <View style={styles.priorityRow}>
            {(['high', 'normal', 'low'] as TaskPriority[]).map(p => {
              const pCfg = PRIORITY_CONFIG[p];
              const selected = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, selected && { backgroundColor: pCfg.color + '30', borderColor: pCfg.color }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, { color: selected ? pCfg.color : COLORS.textSecondary }]}>
                    {pCfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Deadline */}
          <TextInput
            style={styles.modalInput}
            placeholder="Deadline (YYYY-MM-DD) ไม่บังคับ"
            placeholderTextColor={COLORS.textMuted}
            value={deadlineText}
            onChangeText={setDeadlineText}
            keyboardType="numeric"
          />

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, !title.trim() && { opacity: 0.5 }]}
              onPress={() => {
                if (!title.trim()) return;
                onSubmit({ title: title.trim(), description, priority, deadline: deadlineText });
                onClose();
              }}
              disabled={!title.trim()}
            >
              <Text style={styles.modalSubmitText}>{editingTask ? 'บันทึก' : 'เพิ่ม'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Badges Section ───
const BadgesDisplay = ({ badges }: { badges: Badge[] }) => {
  if (badges.length === 0) return null;

  return (
    <View style={styles.badgesSection}>
      <Text style={styles.badgesTitle}>🏅 Badges ที่ได้รับ</Text>
      <View style={styles.badgesGrid}>
        {badges.map(b => {
          const cfg = BADGE_CONFIG[b.badge_id];
          if (!cfg) return null;
          return (
            <View key={b.badge_id} style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>{cfg.icon}</Text>
              <Text style={styles.badgeName}>{cfg.nameTh}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Main Screen ───
const TaskScreen: React.FC = () => {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [activeTab, setActiveTab] = useState<'kanban' | 'profile'>('kanban');
  const [xpToast, setXpToast] = useState({ xp: 0, visible: false });
  const [initDone, setInitDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, profileRes] = await Promise.all([
        tasksApi.list().catch(() => ({ tasks: [] })),
        gamificationApi.getProfile().catch(() => null),
      ]);
      setTasks(tasksRes.tasks || []);
      if (profileRes) {
        setProfile(profileRes.profile);
        setBadges(profileRes.badges || []);
      }
      setInitDone(true);
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError('ไม่สามารถโหลดข้อมูลได้');
      setInitDone(true);
    }
  }, []);

  // Init tables + check streak on first load
  useEffect(() => {
    (async () => {
      try {
        await gamificationApi.initTables().catch(() => {});
        await gamificationApi.checkStreak().catch(() => {});
      } catch {}
      loadData();
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await gamificationApi.checkStreak().catch(() => {});
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Task actions
  const handleAddTask = useCallback(async (data: { title: string; description: string; priority: TaskPriority; deadline: string }) => {
    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, data);
      } else {
        await tasksApi.create(data);
      }
      setEditingTask(null);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'ไม่สามารถบันทึก Task ได้');
    }
  }, [editingTask, loadData]);

  const handleMoveTask = useCallback(async (taskId: number, newStatus: TaskStatus) => {
    try {
      const result = await tasksApi.updateStatus(taskId, newStatus);
      if (result.xp_earned > 0) {
        setXpToast({ xp: result.xp_earned, visible: true });
        setTimeout(() => setXpToast(prev => ({ ...prev, visible: false })), 2000);
      }
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'ไม่สามารถย้ายสถานะได้');
    }
  }, [loadData]);

  const handleDeleteTask = useCallback((taskId: number) => {
    Alert.alert('ลบ Task', 'ต้องการลบ Task นี้ใช่ไหม?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await tasksApi.delete(taskId);
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }, [loadData]);

  const handleEditTask = useCallback((task: KanbanTask) => {
    setEditingTask(task);
    setShowAddModal(true);
  }, []);

  // Group tasks by status
  const newTasks = tasks.filter(t => t.status === 'new');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Task Board</Text>
            <Text style={styles.headerSubtitle}>Kanban + Gamification</Text>
          </View>
          {profile && (
            <View style={styles.headerXp}>
              <Text style={styles.headerLevelIcon}>{LEVEL_CONFIG[profile.level as Level]?.icon || '🌱'}</Text>
              <Text style={styles.headerXpText}>{profile.total_xp} XP</Text>
            </View>
          )}
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'kanban' && styles.tabActive]}
            onPress={() => setActiveTab('kanban')}
          >
            <Text style={[styles.tabText, activeTab === 'kanban' && styles.tabTextActive]}>📋 Kanban</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>🏆 Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* XP Toast */}
      <XpToast xp={xpToast.xp} visible={xpToast.visible} />

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.errorRetry}>ลองใหม่</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {activeTab === 'kanban' ? (
          <>
            {/* Level Progress */}
            <LevelProgressBar profile={profile} />

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              {(['new', 'in_progress', 'done'] as TaskStatus[]).map(status => {
                const cfg = STATUS_CONFIG_KANBAN[status];
                const count = tasks.filter(t => t.status === status).length;
                return (
                  <View key={status} style={[styles.quickStatItem, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.quickStatIcon}>{cfg.icon}</Text>
                    <Text style={[styles.quickStatNum, { color: cfg.color }]}>{count}</Text>
                    <Text style={styles.quickStatLabel}>{cfg.labelTh}</Text>
                  </View>
                );
              })}
            </View>

            {/* Kanban Columns */}
            <KanbanColumn status="new" tasks={newTasks} onMoveTask={handleMoveTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            <KanbanColumn status="in_progress" tasks={inProgressTasks} onMoveTask={handleMoveTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />
            <KanbanColumn status="done" tasks={doneTasks} onMoveTask={handleMoveTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} />

            {/* Tip */}
            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                แตะ Task = แก้ไข | กดค้าง = ลบ{'\n'}
                ทำ Task เสร็จ = ได้ XP! ทำก่อน deadline ได้ XP เพิ่ม
              </Text>
            </View>
          </>
        ) : (
          /* Profile Tab */
          <>
            <LevelProgressBar profile={profile} />

            {/* All Levels */}
            <View style={styles.allLevels}>
              <Text style={styles.allLevelsTitle}>📊 ระดับทั้งหมด</Text>
              {(['rookie', 'planner', 'organizer', 'strategist', 'master'] as Level[]).map(lvl => {
                const cfg = LEVEL_CONFIG[lvl];
                const isCurrent = profile?.level === lvl;
                return (
                  <View key={lvl} style={[styles.levelRow, isCurrent && styles.levelRowCurrent]}>
                    <Text style={styles.levelRowIcon}>{cfg.icon}</Text>
                    <View style={styles.levelRowInfo}>
                      <Text style={[styles.levelRowName, { color: isCurrent ? cfg.color : COLORS.text }]}>{cfg.labelTh}</Text>
                      <Text style={styles.levelRowXp}>{cfg.minXp} XP</Text>
                    </View>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: cfg.color + '30' }]}>
                        <Text style={[styles.currentBadgeText, { color: cfg.color }]}>ปัจจุบัน</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Badges */}
            <BadgesDisplay badges={badges} />

            {/* All Available Badges */}
            <View style={styles.allBadges}>
              <Text style={styles.allBadgesTitle}>🎯 Badge ทั้งหมด</Text>
              {Object.entries(BADGE_CONFIG).map(([id, cfg]) => {
                const earned = badges.some(b => b.badge_id === id);
                return (
                  <View key={id} style={[styles.badgeRow, !earned && styles.badgeRowLocked]}>
                    <Text style={[styles.badgeRowIcon, !earned && { opacity: 0.3 }]}>{cfg.icon}</Text>
                    <View style={styles.badgeRowInfo}>
                      <Text style={[styles.badgeRowName, !earned && { color: COLORS.textMuted }]}>{cfg.nameTh}</Text>
                      <Text style={styles.badgeRowDesc}>{cfg.description}</Text>
                    </View>
                    {earned && <Text style={styles.badgeEarned}>✓</Text>}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB - Add Task */}
      {activeTab === 'kanban' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingTask(null);
            setShowAddModal(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <AddTaskModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleAddTask}
        editingTask={editingTask}
      />
    </View>
  );
};

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  headerXp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: COLORS.glassBorder,
  },
  headerLevelIcon: { fontSize: 18, marginRight: 6 },
  headerXpText: { fontSize: 14, fontWeight: '700', color: COLORS.accent },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primaryLight },

  // Level Bar
  levelBar: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  levelBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelIcon: { fontSize: 24 },
  levelName: { fontSize: 16, fontWeight: '700' },
  xpDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  xpText: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  xpNextText: { fontSize: 12, color: COLORS.textMuted },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.backgroundSecondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakIcon: { fontSize: 14 },
  streakText: { fontSize: 12, color: COLORS.textSecondary },
  longestStreak: { fontSize: 11, color: COLORS.textMuted },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  quickStatItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickStatIcon: { fontSize: 20, marginBottom: 4 },
  quickStatNum: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Kanban Column
  kanbanColumn: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    marginBottom: 10,
    gap: 8,
  },
  columnIcon: { fontSize: 16 },
  columnTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  columnCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  columnCountText: { fontSize: 12, fontWeight: '700' },
  emptyColumn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyColumnText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },

  // Task Card
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  taskCardOverdue: {
    borderColor: COLORS.danger + '60',
    borderWidth: 1,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityLabel: { fontSize: 11, fontWeight: '600' },
  deadlineText: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 'auto' },
  deadlineOverdue: { color: COLORS.danger },
  taskCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10, lineHeight: 20 },
  taskCardTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpEarned: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  moveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  moveBtnText: { fontSize: 11, fontWeight: '700' },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderRadius: 12,
    gap: 8,
  },
  tipIcon: { fontSize: 16 },
  tipText: { fontSize: 11, color: COLORS.primaryLight, lineHeight: 18, flex: 1 },

  // XP Toast
  xpToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
    ...SHADOWS.glow,
  },
  xpToastText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textInverse,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '20',
    paddingVertical: 8,
    gap: 12,
  },
  errorText: { fontSize: 13, color: COLORS.danger },
  errorRetry: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight },

  // Scroll
  scrollArea: { flex: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  fabText: { fontSize: 30, color: COLORS.white, fontWeight: '300', marginTop: -2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  priorityBtnText: { fontSize: 13, fontWeight: '600' },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // Profile - Levels list
  allLevels: {
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  allLevelsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  levelRowCurrent: {
    backgroundColor: COLORS.glass,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  levelRowIcon: { fontSize: 22 },
  levelRowInfo: { flex: 1 },
  levelRowName: { fontSize: 14, fontWeight: '600' },
  levelRowXp: { fontSize: 11, color: COLORS.textMuted },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentBadgeText: { fontSize: 11, fontWeight: '700' },

  // Profile - Badges
  badgesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  badgesTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: (SCREEN_WIDTH - 64) / 3,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeName: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  allBadges: {
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  allBadgesTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  badgeRowLocked: { opacity: 0.5 },
  badgeRowIcon: { fontSize: 22 },
  badgeRowInfo: { flex: 1 },
  badgeRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  badgeRowDesc: { fontSize: 11, color: COLORS.textMuted },
  badgeEarned: { fontSize: 16, color: COLORS.success, fontWeight: '700' },
});

export default TaskScreen;
