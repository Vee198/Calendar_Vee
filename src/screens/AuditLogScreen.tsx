import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { api } from '../services/api';
import { COLORS } from '../constants/theme';

interface AuditEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  eventTitle: string;
  changedBy: string;
  timestamp: string;
  details?: string;
}

const AuditLogScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Backend returns: { id, action, event_title, changed_by, changed_at, ... }
  const normalizeLog = (raw: any): AuditEntry => ({
    id: String(raw.id ?? Math.random()),
    action: raw.action || 'other',
    eventTitle: raw.event_title || raw.eventTitle || '-',
    changedBy: raw.changed_by || raw.changedBy || '-',
    timestamp: raw.changed_at || raw.timestamp || new Date().toISOString(),
    details: raw.new_data || raw.details || undefined,
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAuditLog({ limit: 200 });
      const rawLogs: any[] = (response as any).audit_log || response || [];
      setLogs(Array.isArray(rawLogs) ? rawLogs.map(normalizeLog) : []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.getAuditLog({ limit: 200 });
      const rawLogs: any[] = (response as any).audit_log || response || [];
      setLogs(Array.isArray(rawLogs) ? rawLogs.map(normalizeLog) : []);
    } catch (error) {
      console.error('Error refreshing logs:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatThaiDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '•';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create':
        return COLORS.success;
      case 'update':
        return COLORS.primary;
      case 'delete':
        return COLORS.danger;
      default:
        return COLORS.textSecondary;
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'create':
        return 'สร้าง';
      case 'update':
        return 'แก้ไข';
      case 'delete':
        return 'ลบ';
      default:
        return 'อื่นๆ';
    }
  };

  const exportToCSV = useCallback(async () => {
    try {
      setExporting(true);
      const headers = ['ลำดับ', 'การดำเนินการ', 'ชื่องาน', 'แก้ไขโดย', 'เวลา', 'รายละเอียด'];
      const rows = logs.map((log, index) => [
        (index + 1).toString(),
        getActionLabel(log.action),
        log.eventTitle,
        log.changedBy,
        new Date(log.timestamp).toLocaleString('th-TH'),
        log.details || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const fileName = `audit_log_${new Date().getTime()}.csv`;
      const path = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Share.share({
        url: `file://${path}`,
        title: 'บันทึกการเปลี่ยนแปลง',
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งออก CSV ได้');
    } finally {
      setExporting(false);
    }
  }, [logs]);

  const exportToTXT = useCallback(async () => {
    try {
      setExporting(true);
      const txt = logs
        .map(
          (log, index) =>
            `${index + 1}. [${getActionLabel(log.action)}] ${log.eventTitle}\n` +
            `   แก้ไขโดย: ${log.changedBy}\n` +
            `   เวลา: ${formatThaiDateTime(log.timestamp)}\n` +
            (log.details ? `   รายละเอียด: ${log.details}\n` : '') +
            '\n'
        )
        .join('');

      const fileName = `audit_log_${new Date().getTime()}.txt`;
      const path = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(path, txt, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Share.share({
        url: `file://${path}`,
        title: 'บันทึกการเปลี่ยนแปลง',
      });
    } catch (error) {
      console.error('Error exporting to TXT:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งออก TXT ได้');
    } finally {
      setExporting(false);
    }
  }, [logs]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>บันทึกการเปลี่ยนแปลง</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, styles.csvButton]}
            onPress={exportToCSV}
            disabled={exporting}
          >
            <Text style={styles.exportButtonText}>📊 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.txtButton]}
            onPress={exportToTXT}
            disabled={exporting}
          >
            <Text style={styles.exportButtonText}>📄 TXT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log List */}
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.logItem,
              { borderLeftColor: getActionColor(item.action) },
            ]}
          >
            <View style={styles.logMain}>
              <View style={styles.logHeader}>
                <Text style={styles.logIcon}>{getActionIcon(item.action)}</Text>
                <View style={styles.logTitleArea}>
                  <Text style={styles.logTitle}>{item.eventTitle}</Text>
                  <Text style={styles.logAction}>{getActionLabel(item.action)}</Text>
                </View>
              </View>

              <View style={styles.logDetails}>
                <View style={styles.logDetailRow}>
                  <Text style={styles.logDetailLabel}>แก้ไขโดย:</Text>
                  <Text style={styles.logDetailValue}>{item.changedBy}</Text>
                </View>
                <View style={styles.logDetailRow}>
                  <Text style={styles.logDetailLabel}>เวลา:</Text>
                  <Text style={styles.logDetailValue}>{formatThaiDateTime(item.timestamp)}</Text>
                </View>
                {item.details && (
                  <View style={styles.logDetailRow}>
                    <Text style={styles.logDetailLabel}>รายละเอียด:</Text>
                    <Text style={styles.logDetailValue}>{item.details}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีบันทึกการเปลี่ยนแปลง</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />

      {exporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.exportingText}>กำลังส่งออก...</Text>
        </View>
      )}
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
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvButton: {
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  txtButton: {
    backgroundColor: `${COLORS.success}20`,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logMain: {
    gap: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logIcon: {
    fontSize: 20,
  },
  logTitleArea: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  logAction: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  logDetails: {
    marginLeft: 28,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    gap: 4,
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  logDetailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    minWidth: 60,
  },
  logDetailValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  exportingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  exportingText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AuditLogScreen;
