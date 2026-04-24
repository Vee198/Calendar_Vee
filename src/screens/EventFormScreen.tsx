import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import api from '../services/api';
import { COLORS } from '../constants/theme';

// Thai locale for calendar
LocaleConfig.locales['th'] = {
  monthNames: ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'],
  monthNamesShort: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
  dayNames: ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'],
  dayNamesShort: ['อา','จ','อ','พ','พฤ','ศ','ส'],
  today: 'วันนี้',
};
LocaleConfig.defaultLocale = 'th';

const CATEGORIES = [
  { label: 'ประชุม', value: 'meeting', color: '#EF4444' },
  { label: 'อบรม', value: 'training', color: '#F59E0B' },
  { label: 'กิจกรรม', value: 'event', color: '#10B981' },
  { label: 'วันหยุด', value: 'holiday', color: '#EC4899' },
  { label: 'กำหนดส่ง', value: 'deadline', color: '#8B5CF6' },
  { label: 'อื่นๆ', value: 'other', color: '#6B7280' },
];

const PRIORITIES = [
  { label: 'สูง', value: 'high' },
  { label: 'ปกติ', value: 'normal' },
  { label: 'ต่ำ', value: 'low' },
];

const STATUSES = [
  { label: 'กำหนดการ', value: 'scheduled' },
  { label: 'เสร็จแล้ว', value: 'completed' },
  { label: 'ยกเลิก', value: 'cancelled' },
];

const RECURRENCES = [
  { label: 'ไม่ซ้ำ', value: 'none' },
  { label: 'ทุกวัน', value: 'daily' },
  { label: 'ทุกสัปดาห์', value: 'weekly' },
  { label: 'ทุกเดือน', value: 'monthly' },
  { label: 'ทุกปี', value: 'yearly' },
];

const REMINDER_OPTIONS = [
  { label: 'ไม่เตือน', value: '0' },
  { label: '10 นาที', value: '10' },
  { label: '15 นาที', value: '15' },
  { label: '30 นาที', value: '30' },
  { label: '1 ชั่วโมง', value: '60' },
];

const EVENT_TEMPLATES = [
  {
    label: '📋 ประชุมทีม',
    data: { title: 'ประชุมทีม', category: 'meeting', priority: 'normal', description: 'ประชุมทีมประจำสัปดาห์', location: 'ห้องประชุม' }
  },
  {
    label: '🎤 Interview',
    data: { title: 'Interview', category: 'meeting', priority: 'high', description: 'สัมภาษณ์ผู้สมัครงาน' }
  },
  {
    label: '📚 อบรม',
    data: { title: 'อบรม', category: 'training', priority: 'normal', description: 'อบรมพนักงาน' }
  },
  {
    label: '📅 กำหนดส่ง',
    data: { title: '', category: 'deadline', priority: 'high', description: '' }
  },
  {
    label: '🎉 กิจกรรม',
    data: { title: '', category: 'event', priority: 'normal', description: '' }
  },
];

// Generate hour/minute arrays
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: string;
  status: string;
  notify_line: boolean;
  notify_email: boolean;
  notes: string;
  recurrence: string;
  recurrence_end: string;
  reminder_minutes: number;
}

// ─── Reusable Option Selector ────────────────────────────────────
interface OptionSelectorProps {
  options: { label: string; value: string; color?: string }[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({ options, selected, onSelect, disabled }) => (
  <View style={optStyles.container}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt.value}
        style={[optStyles.btn, selected === opt.value && optStyles.btnActive]}
        onPress={() => !disabled && onSelect(opt.value)}
        disabled={disabled}
      >
        {opt.color && (
          <View style={[optStyles.colorDot, { backgroundColor: opt.color }]} />
        )}
        <Text style={[optStyles.btnText, selected === opt.value && optStyles.btnTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const optStyles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  btnText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  btnTextActive: { color: COLORS.white, fontWeight: '700' },
});

// ─── Time Picker Modal ───────────────────────────────────────────
interface TimePickerProps {
  visible: boolean;
  hour: string;
  minute: string;
  onConfirm: (hour: string, minute: string) => void;
  onCancel: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ visible, hour, minute, onConfirm, onCancel }) => {
  const [selHour, setSelHour] = useState(hour);
  const [selMin, setSelMin] = useState(minute);

  useEffect(() => {
    if (visible) {
      setSelHour(hour);
      // Snap to nearest quarter
      const m = parseInt(minute);
      if (m < 8) setSelMin('00');
      else if (m < 23) setSelMin('15');
      else if (m < 38) setSelMin('30');
      else if (m < 53) setSelMin('45');
      else setSelMin('00');
    }
  }, [visible, hour, minute]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={tpStyles.overlay}>
        <View style={tpStyles.container}>
          <Text style={tpStyles.title}>เลือกเวลา</Text>

          <View style={tpStyles.pickerRow}>
            {/* Hours */}
            <View style={tpStyles.column}>
              <Text style={tpStyles.colLabel}>ชั่วโมง</Text>
              <ScrollView style={tpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[tpStyles.cell, selHour === h && tpStyles.cellActive]}
                    onPress={() => setSelHour(h)}
                  >
                    <Text style={[tpStyles.cellText, selHour === h && tpStyles.cellTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={tpStyles.colon}>:</Text>

            {/* Minutes */}
            <View style={tpStyles.column}>
              <Text style={tpStyles.colLabel}>นาที</Text>
              <ScrollView style={tpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[tpStyles.cell, selMin === m && tpStyles.cellActive]}
                    onPress={() => setSelMin(m)}
                  >
                    <Text style={[tpStyles.cellText, selMin === m && tpStyles.cellTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={tpStyles.preview}>{selHour}:{selMin} น.</Text>

          <View style={tpStyles.buttons}>
            <TouchableOpacity style={tpStyles.cancelBtn} onPress={onCancel}>
              <Text style={tpStyles.cancelText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tpStyles.confirmBtn}
              onPress={() => onConfirm(selHour, selMin)}
            >
              <Text style={tpStyles.confirmText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: Dimensions.get('window').width * 0.8,
    maxHeight: 420,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  column: { alignItems: 'center', flex: 1 },
  colLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  scrollCol: { maxHeight: 200 },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
    minWidth: 60,
  },
  cellActive: { backgroundColor: COLORS.primary },
  cellText: { fontSize: 18, color: COLORS.text, fontWeight: '500' },
  cellTextActive: { color: COLORS.white, fontWeight: '700' },
  colon: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginTop: 20 },
  preview: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
});

// ─── Main Form Component ─────────────────────────────────────────
const EventFormScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { eventId } = route.params || {};
  const isEditing = !!eventId;

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    category: 'meeting',
    priority: 'normal',
    status: 'scheduled',
    notify_line: false,
    notify_email: false,
    notes: '',
    recurrence: 'none',
    recurrence_end: '',
    reminder_minutes: 15,
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Calendar modal state
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end' | 'recurrence_end' | null>(null);
  // Time picker state
  const [timeTarget, setTimeTarget] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (isEditing) loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.getEvent(eventId);
      const event = response?.event || response;
      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        start_time: event.start_time || new Date().toISOString(),
        end_time: event.end_time || new Date(Date.now() + 3600000).toISOString(),
        category: event.category || 'meeting',
        priority: event.priority || 'normal',
        status: event.status || 'scheduled',
        notify_line: !!event.notify_line,
        notify_email: !!event.notify_email,
        notes: event.notes || '',
        recurrence: event.recurrence || 'none',
        recurrence_end: event.recurrence_end || '',
        reminder_minutes: event.reminder_minutes || 15,
      });
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ─────────────────────
  const getDateStr = (iso: string) => {
    try {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
    catch {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
  };

  const getHour = (iso: string) => {
    try { return String(new Date(iso).getHours()).padStart(2, '0'); }
    catch { return '09'; }
  };

  const getMinute = (iso: string) => {
    try { return String(new Date(iso).getMinutes()).padStart(2, '0'); }
    catch { return '00'; }
  };

  const formatThaiDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch { return '-'; }
  };

  const formatTime = (iso: string) => `${getHour(iso)}:${getMinute(iso)} น.`;

  const buildISO = (dateStr: string, hour: string, minute: string) => {
    const d = new Date(dateStr);
    d.setHours(parseInt(hour), parseInt(minute), 0, 0);
    return d.toISOString();
  };

  // ─── Calendar callbacks ──────────
  const onCalendarDayPress = (day: any) => {
    if (calendarTarget === 'recurrence_end') {
      setFormData(p => ({ ...p, recurrence_end: day.dateString }));
    } else {
      const field = calendarTarget === 'start' ? 'start_time' : 'end_time';
      const h = getHour(formData[field]);
      const m = getMinute(formData[field]);
      const newISO = buildISO(day.dateString, h, m);

      if (calendarTarget === 'start') {
        // If start > end, auto-adjust end to same day +1 hour
        const endDate = new Date(newISO);
        endDate.setHours(endDate.getHours() + 1);
        if (new Date(newISO) >= new Date(formData.end_time)) {
          setFormData(p => ({ ...p, start_time: newISO, end_time: endDate.toISOString() }));
        } else {
          setFormData(p => ({ ...p, start_time: newISO }));
        }
      } else {
        setFormData(p => ({ ...p, end_time: newISO }));
      }
    }
    setCalendarTarget(null);
  };

  const onTimeConfirm = (hour: string, minute: string) => {
    const field = timeTarget === 'start' ? 'start_time' : 'end_time';
    const dateStr = getDateStr(formData[field]);
    const newISO = buildISO(dateStr, hour, minute);
    setFormData(p => ({ ...p, [field]: newISO }));
    setTimeTarget(null);
  };

  // ─── Save logic ──────────────────
  const checkOverlap = async () => {
    try {
      const response = await api.checkEventOverlap({
        start_time: formData.start_time,
        end_time: formData.end_time,
        exclude_id: isEditing ? eventId : undefined,
      });
      return (response as any)?.overlaps?.length > 0 || false;
    } catch { return false; }
  };

  const saveEvent = async () => {
    try {
      if (isEditing) {
        await api.updateEvent(eventId, formData);
        Alert.alert('สำเร็จ', 'อัปเดตกิจกรรมแล้ว', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await api.createEvent(formData);
        Alert.alert('สำเร็จ', 'สร้างกิจกรรมแล้ว', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกได้');
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ชื่อกิจกรรม');
      return;
    }
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      Alert.alert('ข้อผิดพลาด', 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น');
      return;
    }
    try {
      setSubmitting(true);
      const hasOverlap = await checkOverlap();
      if (hasOverlap) {
        Alert.alert('มีการซ้อนทับ', 'กิจกรรมนี้ซ้อนทับกับกิจกรรมอื่น ต้องการบันทึกต่อไหม?', [
          { text: 'ยกเลิก', style: 'cancel', onPress: () => setSubmitting(false) },
          { text: 'บันทึกต่อ', onPress: saveEvent },
        ]);
        return;
      }
      await saveEvent();
    } catch {
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const startDateStr = getDateStr(formData.start_time);
  const endDateStr = getDateStr(formData.end_time);

  // ─── Template Handler ─────────────────────────────────────────────
  const applyTemplate = (templateData: any) => {
    setFormData(p => ({
      ...p,
      ...templateData,
      start_time: p.start_time,
      end_time: p.end_time,
    }));
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Event Templates - Only for new events */}
        {!isEditing && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>เลือกแม่แบบ (ไม่บังคับ)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.templateScroll}
            >
              {EVENT_TEMPLATES.map(template => (
                <TouchableOpacity
                  key={template.label}
                  style={styles.templateChip}
                  onPress={() => applyTemplate(template.data)}
                >
                  <Text style={styles.templateChipText}>{template.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ชื่อกิจกรรม *</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น ประชุมทีม, Interview, ..."
            placeholderTextColor={COLORS.textSecondary}
            value={formData.title}
            onChangeText={t => setFormData(p => ({ ...p, title: t }))}
            editable={!submitting}
          />
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="รายละเอียดกิจกรรม"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.description}
            onChangeText={t => setFormData(p => ({ ...p, description: t }))}
            multiline
            numberOfLines={3}
            editable={!submitting}
          />
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>สถานที่</Text>
          <TextInput
            style={styles.input}
            placeholder="สถานที่จัดกิจกรรม"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.location}
            onChangeText={t => setFormData(p => ({ ...p, location: t }))}
            editable={!submitting}
          />
        </View>

        {/* ─── Start Date & Time ──────────────────── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>วันที่และเวลาเริ่มต้น</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setCalendarTarget('start')}
              disabled={submitting}
            >
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatThaiDate(formData.start_time)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setTimeTarget('start')}
              disabled={submitting}
            >
              <Text style={styles.timeBtnIcon}>🕐</Text>
              <Text style={styles.timeBtnText}>{formatTime(formData.start_time)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── End Date & Time ────────────────────── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>วันที่และเวลาสิ้นสุด</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setCalendarTarget('end')}
              disabled={submitting}
            >
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatThaiDate(formData.end_time)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setTimeTarget('end')}
              disabled={submitting}
            >
              <Text style={styles.timeBtnIcon}>🕐</Text>
              <Text style={styles.timeBtnText}>{formatTime(formData.end_time)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>หมวดหมู่</Text>
          <OptionSelector
            options={CATEGORIES}
            selected={formData.category}
            onSelect={v => setFormData(p => ({ ...p, category: v }))}
            disabled={submitting}
          />
        </View>

        {/* Priority */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ลำดับความสำคัญ</Text>
          <OptionSelector
            options={PRIORITIES}
            selected={formData.priority}
            onSelect={v => setFormData(p => ({ ...p, priority: v }))}
            disabled={submitting}
          />
        </View>

        {/* Status */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>สถานะ</Text>
          <OptionSelector
            options={STATUSES}
            selected={formData.status}
            onSelect={v => setFormData(p => ({ ...p, status: v }))}
            disabled={submitting}
          />
        </View>

        {/* Recurring Events */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>การเกิดซ้ำ</Text>
          <OptionSelector
            options={RECURRENCES}
            selected={formData.recurrence}
            onSelect={v => setFormData(p => ({ ...p, recurrence: v }))}
            disabled={submitting}
          />
        </View>

        {/* Recurrence End Date - Show only if recurrence is not 'none' */}
        {formData.recurrence !== 'none' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>วันสิ้นสุดการเกิดซ้ำ</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setCalendarTarget('recurrence_end')}
              disabled={submitting}
            >
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>
                {formData.recurrence_end ? formatThaiDate(formData.recurrence_end + 'T00:00:00') : 'เลือกวันที่'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>การแจ้งเตือน</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>แจ้งเตือน Telegram</Text>
            <Switch
              value={formData.notify_line}
              onValueChange={v => setFormData(p => ({ ...p, notify_line: v }))}
              disabled={submitting}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
              thumbColor={formData.notify_line ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          {formData.notify_line && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.label, { marginBottom: 6 }]}>เตือนล่วงหน้า</Text>
              <OptionSelector
                options={REMINDER_OPTIONS}
                selected={String(formData.reminder_minutes)}
                onSelect={v => setFormData(p => ({ ...p, reminder_minutes: parseInt(v) }))}
                disabled={submitting}
              />
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>หมายเหตุ</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="หมายเหตุเพิ่มเติม"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.notes}
            onChangeText={t => setFormData(p => ({ ...p, notes: t }))}
            multiline
            numberOfLines={3}
            editable={!submitting}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, submitting && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>{isEditing ? 'อัปเดต' : 'สร้างกิจกรรม'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Calendar Modal ──────────────────────────── */}
      <Modal
        visible={calendarTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <Text style={styles.calModalTitle}>
              {calendarTarget === 'start' ? 'เลือกวันเริ่มต้น' : calendarTarget === 'end' ? 'เลือกวันสิ้นสุด' : 'เลือกวันสิ้นสุดการเกิดซ้ำ'}
            </Text>
            <Calendar
              current={
                calendarTarget === 'start'
                  ? startDateStr
                  : calendarTarget === 'end'
                  ? endDateStr
                  : formData.recurrence_end || new Date().toISOString().split('T')[0]
              }
              onDayPress={onCalendarDayPress}
              markedDates={
                calendarTarget === 'recurrence_end'
                  ? {
                      [formData.recurrence_end]: {
                        selected: true,
                        selectedColor: COLORS.primary,
                        marked: true,
                        dotColor: COLORS.white,
                      },
                    }
                  : {
                      [startDateStr]: {
                        selected: true,
                        selectedColor: COLORS.primary,
                        marked: true,
                        dotColor: COLORS.white,
                      },
                      [endDateStr]: {
                        selected: true,
                        selectedColor: COLORS.danger,
                        marked: true,
                        dotColor: COLORS.white,
                      },
                    }
              }
              theme={{
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
              }}
              enableSwipeMonths
            />
            {calendarTarget !== 'recurrence_end' && (
              <View style={styles.calLegend}>
                <View style={styles.calLegendItem}>
                  <View style={[styles.calLegendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.calLegendText}>เริ่มต้น</Text>
                </View>
                <View style={styles.calLegendItem}>
                  <View style={[styles.calLegendDot, { backgroundColor: COLORS.danger }]} />
                  <Text style={styles.calLegendText}>สิ้นสุด</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.calCancelBtn}
              onPress={() => setCalendarTarget(null)}
            >
              <Text style={styles.calCancelText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Time Picker Modal ───────────────────────── */}
      <TimePicker
        visible={timeTarget !== null}
        hour={getHour(timeTarget === 'start' ? formData.start_time : formData.end_time)}
        minute={getMinute(timeTarget === 'start' ? formData.start_time : formData.end_time)}
        onConfirm={onTimeConfirm}
        onCancel={() => setTimeTarget(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  formGroup: {
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  // ─── Date/Time buttons ─────────
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateBtnIcon: { fontSize: 20 },
  dateBtnText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  timeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
  },
  timeBtnIcon: { fontSize: 18 },
  timeBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '700' },
  // ─── Template Chips ────────────────
  templateScroll: { marginHorizontal: -14, paddingHorizontal: 14 },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    marginRight: 10,
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  // ─── Toggle ────────────────────
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  // ─── Save ──────────────────────
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  // ─── Calendar Modal ────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    width: Dimensions.get('window').width * 0.92,
  },
  calModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  calLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
    marginBottom: 8,
  },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calLegendDot: { width: 12, height: 12, borderRadius: 6 },
  calLegendText: { fontSize: 12, color: COLORS.textSecondary },
  calCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  calCancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});

export default EventFormScreen;
