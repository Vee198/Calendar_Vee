import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'bank' | 'company' | 'other';
}

interface User {
  role: 'admin' | 'viewer';
}

const THAI_YEAR_OFFSET = 543;
const HOLIDAY_TYPES = [
  { label: 'วันธนาคาร', value: 'bank' },
  { label: 'วันบริษัท', value: 'company' },
  { label: 'อื่นๆ', value: 'other' },
];

const HolidaysScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear() + THAI_YEAR_OFFSET);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState<'bank' | 'company' | 'other'>('bank');

  // Load holidays on mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        await loadHolidays();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  const loadHolidays = useCallback(async () => {
    try {
      const thaiYear = year;
      const gregorianYear = thaiYear - THAI_YEAR_OFFSET;
      const response = await api.getHolidays(gregorianYear);
      setHolidays(response.holidays || response || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  }, [year]);

  // Reload holidays when year changes
  useEffect(() => {
    loadHolidays();
  }, [year, loadHolidays]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHolidays();
    } catch (error) {
      console.error('Error refreshing holidays:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadHolidays]);

  const handleAddPressed = useCallback(() => {
    setEditingId(null);
    setSelectedDate(new Date());
    setHolidayName('');
    setHolidayType('bank');
    setShowModal(true);
  }, []);

  const handleEditPressed = useCallback((holiday: Holiday) => {
    setEditingId(holiday.id);
    const parts = holiday.date.split('-');
    const editDate = new Date(
      parseInt(parts[0]) - THAI_YEAR_OFFSET,
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
    setSelectedDate(editDate);
    setHolidayName(holiday.name);
    setHolidayType(holiday.type);
    setShowModal(true);
  }, []);

  const handleDeletePressed = useCallback((holidayId: string) => {
    Alert.alert('ลบวันหยุด', 'คุณแน่ใจหรือว่าต้องการลบวันหยุดนี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteHoliday(holidayId);
            await loadHolidays();
          } catch (error) {
            console.error('Error deleting holiday:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบวันหยุดได้');
          }
        },
      },
    ]);
  }, [loadHolidays]);

  const handleSaveHoliday = useCallback(async () => {
    if (!holidayName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ชื่อวันหยุด');
      return;
    }

    const thaiYear = selectedDate.getFullYear() + THAI_YEAR_OFFSET;
    const dateString = `${thaiYear}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    try {
      if (editingId) {
        await api.updateHoliday(editingId, {
          date: dateString,
          name: holidayName,
          type: holidayType,
        });
      } else {
        await api.createHoliday({
          date: dateString,
          name: holidayName,
          type: holidayType,
        });
      }
      setShowModal(false);
      await loadHolidays();
      Alert.alert('สำเร็จ', editingId ? 'อัปเดตวันหยุดแล้ว' : 'เพิ่มวันหยุดแล้ว');
    } catch (error) {
      console.error('Error saving holiday:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกวันหยุดได้');
    }
  }, [selectedDate, holidayName, holidayType, editingId, loadHolidays]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleInitHolidays = useCallback(async () => {
    Alert.alert(
      'เริ่มต้นวันหยุด',
      'นี่จะเพิ่มวันหยุดธนาคารไทยทั้งปีปัจจุบัน',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'เริ่มต้น',
          onPress: async () => {
            try {
              await api.initializeHolidays();
              await loadHolidays();
              Alert.alert('สำเร็จ', 'ได้เพิ่มวันหยุดแล้ว');
            } catch (error) {
              console.error('Error initializing holidays:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเริ่มต้นวันหยุดได้');
            }
          },
        },
      ]
    );
  }, [loadHolidays]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const typeColors: Record<string, string> = {
    bank: COLORS.primary,
    company: COLORS.success,
    other: COLORS.warning,
  };

  const typeLabels: Record<string, string> = {
    bank: 'วันธนาคาร',
    company: 'วันบริษัท',
    other: 'อื่นๆ',
  };

  const formatThaiDate = (dateString: string) => {
    const parts = dateString.split('-');
    const date = new Date(
      parseInt(parts[0]) - THAI_YEAR_OFFSET,
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setYear(year - 1)}>
          <Text style={styles.navButton}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}</Text>
        <TouchableOpacity onPress={() => setYear(year + 1)}>
          <Text style={styles.navButton}>▶</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddPressed}>
            <Text style={styles.addButtonText}>➕ เพิ่มวันหยุด</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Admin Buttons */}
      {isAdmin && (
        <View style={styles.adminButtons}>
          <TouchableOpacity style={styles.initButton} onPress={handleInitHolidays}>
            <Text style={styles.initButtonText}>🌱 เริ่มต้นวันหยุดธนาคาร</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Holiday List */}
      <FlatList
        data={holidays}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.holidayItem}>
            <View style={styles.holidayContent}>
              <Text style={styles.holidayName}>{item.name}</Text>
              <Text style={styles.holidayDate}>{formatThaiDate(item.date)}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}>
                <Text style={styles.typeBadgeText}>{typeLabels[item.type]}</Text>
              </View>
            </View>

            {isAdmin && (
              <View style={styles.holidayActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPressed(item)}
                >
                  <Text style={styles.editButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePressed(item.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีวันหยุดในปีนี้</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'}
            </Text>

            <View style={styles.modalForm}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonLabel}>วันที่</Text>
                <Text style={styles.dateButtonValue}>
                  {selectedDate.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ชื่อวันหยุด</Text>
                <TextInput
                  style={styles.input}
                  placeholder="เช่น วันปีใหม่"
                  placeholderTextColor={COLORS.textSecondary}
                  value={holidayName}
                  onChangeText={setHolidayName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ประเภท</Text>
                <View style={styles.typeSelector}>
                  {HOLIDAY_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        holidayType === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setHolidayType(type.value as 'bank' | 'company' | 'other')
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          holidayType === type.value && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveHoliday}>
                <Text style={styles.saveButtonText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  navButton: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 60,
    textAlign: 'center',
  },
  addButton: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  adminButtons: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  initButton: {
    backgroundColor: `${COLORS.success}20`,
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  initButtonText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  holidayItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  holidayContent: {
    flex: 1,
  },
  holidayName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  holidayActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalForm: {
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dateButtonLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HolidaysScreen;
