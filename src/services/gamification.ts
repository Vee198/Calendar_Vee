import { API_BASE_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───
export type TaskStatus = 'new' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'normal' | 'low';
export type Level = 'rookie' | 'planner' | 'organizer' | 'strategist' | 'master';

export interface KanbanTask {
  id: number;
  user_name: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  xp_awarded: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface GamificationProfile {
  user_name: string;
  total_xp: number;
  level: Level;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface XpLogEntry {
  id: number;
  user_name: string;
  xp_amount: number;
  source: string;
  detail: string;
  created_at: string;
}

export interface Badge {
  badge_id: string;
  earned_at: string;
}

// ─── Constants ───
export const LEVEL_CONFIG: Record<Level, { label: string; labelTh: string; icon: string; minXp: number; color: string }> = {
  rookie:     { label: 'Rookie',     labelTh: 'มือใหม่',     icon: '🌱', minXp: 0,    color: '#64748B' },
  planner:    { label: 'Planner',    labelTh: 'นักวางแผน',    icon: '📋', minXp: 100,  color: '#38BDF8' },
  organizer:  { label: 'Organizer',  labelTh: 'นักจัดการ',    icon: '⚡', minXp: 300,  color: '#A78BFA' },
  strategist: { label: 'Strategist', labelTh: 'นักกลยุทธ์',   icon: '🎯', minXp: 600,  color: '#FBBF24' },
  master:     { label: 'Master',     labelTh: 'เจ้าแห่งเวลา', icon: '👑', minXp: 1000, color: '#F87171' },
};

export const BADGE_CONFIG: Record<string, { name: string; nameTh: string; icon: string; description: string }> = {
  first_task:   { name: 'First Task',      nameTh: 'งานแรก',       icon: '🎉', description: 'ทำ Task แรกสำเร็จ' },
  task_10:      { name: '10 Tasks Done',   nameTh: '10 งาน',      icon: '🔥', description: 'ทำ Task ครบ 10 งาน' },
  task_50:      { name: '50 Tasks Done',   nameTh: '50 งาน',      icon: '💪', description: 'ทำ Task ครบ 50 งาน' },
  task_master:  { name: 'Task Master',     nameTh: 'เทพ Task',    icon: '🏆', description: 'ทำ Task ครบ 100 งาน' },
  streak_7:     { name: '7-Day Streak',    nameTh: 'ต่อเนื่อง 7 วัน', icon: '⚡', description: 'ใช้งานต่อเนื่อง 7 วัน' },
  streak_30:    { name: '30-Day Streak',   nameTh: 'ต่อเนื่อง 30 วัน', icon: '🌟', description: 'ใช้งานต่อเนื่อง 30 วัน' },
  early_bird:   { name: 'Early Bird',      nameTh: 'เช้าชิดสุข',   icon: '🐦', description: 'ทำ Task ก่อน deadline 3 วัน' },
  speed_demon:  { name: 'Speed Demon',     nameTh: 'สายฟ้า',      icon: '⚡', description: 'ทำ 5 Tasks เสร็จใน 1 วัน' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; multiplier: number }> = {
  high:   { label: 'สำคัญ',  color: '#F87171', multiplier: 1.5 },
  normal: { label: 'ปกติ',   color: '#6C63FF', multiplier: 1.0 },
  low:    { label: 'ต่ำ',    color: '#64748B', multiplier: 0.8 },
};

export const STATUS_CONFIG_KANBAN: Record<TaskStatus, { label: string; labelTh: string; icon: string; color: string; bg: string }> = {
  new:         { label: 'New',         labelTh: 'ใหม่',      icon: '📝', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  in_progress: { label: 'In Progress', labelTh: 'กำลังทำ',   icon: '⏳', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' },
  done:        { label: 'Done',        labelTh: 'เสร็จแล้ว', icon: '✅', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' },
};

// ─── Helper: get next level XP threshold ───
export function getNextLevelXp(level: Level): number {
  const levels: Level[] = ['rookie', 'planner', 'organizer', 'strategist', 'master'];
  const idx = levels.indexOf(level);
  if (idx >= levels.length - 1) return LEVEL_CONFIG.master.minXp;
  return LEVEL_CONFIG[levels[idx + 1]].minXp;
}

export function getLevelProgress(totalXp: number, level: Level): number {
  const currentMin = LEVEL_CONFIG[level].minXp;
  const nextMin = getNextLevelXp(level);
  if (level === 'master') return 1;
  return Math.min(1, (totalXp - currentMin) / (nextMin - currentMin));
}

// ─── API Helpers ───
const TOKEN_KEY = '@calendar_vee_token';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
  if (!resp.ok) throw new Error(`API Error ${resp.status}`);
  return resp.json();
}

async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(`API Error ${resp.status}`);
  return resp.json();
}

async function apiPatch<T>(endpoint: string, body: any): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API Error ${resp.status}`);
  return resp.json();
}

async function apiPut<T>(endpoint: string, body: any): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API Error ${resp.status}`);
  return resp.json();
}

async function apiDelete(endpoint: string): Promise<void> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) throw new Error(`API Error ${resp.status}`);
}

// ─── Gamification API ───
export const gamificationApi = {
  getProfile: () => apiGet<{
    profile: GamificationProfile;
    badges: Badge[];
    recent_xp: XpLogEntry[];
  }>('/api/gamification/profile'),

  checkStreak: () => apiPost<{
    streak: number;
    longest_streak: number;
    xp_earned: number;
    new_badges: string[];
    level: Level;
  }>('/api/gamification/check-streak'),

  initTables: () => apiPost<{ success: boolean }>('/api/gamification/init'),
};

// ─── Kanban Tasks API ───
export const tasksApi = {
  list: (status?: TaskStatus) => apiGet<{ tasks: KanbanTask[] }>(
    `/api/tasks${status ? `?status=${status}` : ''}`
  ),

  create: (data: { title: string; description?: string; priority?: TaskPriority; deadline?: string }) =>
    apiPost<{ success: boolean; id: number }>('/api/tasks', data),

  updateStatus: (taskId: number, status: TaskStatus) =>
    apiPatch<{ success: boolean; xp_earned: number; status: string }>(
      `/api/tasks/${taskId}/status`, { status }
    ),

  update: (taskId: number, data: { title: string; description?: string; priority?: TaskPriority; deadline?: string }) =>
    apiPut<{ success: boolean }>(`/api/tasks/${taskId}`, data),

  delete: (taskId: number) => apiDelete(`/api/tasks/${taskId}`),
};
