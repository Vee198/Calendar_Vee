import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

interface SharedMember {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar: string;
  isOnline: boolean;
}

// Mock members - replace with real API
const MOCK_MEMBERS: SharedMember[] = [
  { id: '1', name: 'คุณวีระชัย', role: 'owner', avatar: '👤', isOnline: true },
  { id: '2', name: 'สมาชิก A', role: 'editor', avatar: '👨', isOnline: true },
  { id: '3', name: 'สมาชิก B', role: 'viewer', avatar: '👩', isOnline: false },
];

const SharedCalendarScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const [members] = useState<SharedMember[]>(MOCK_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sharePublic, setSharePublic] = useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert('กรุณากรอก Email หรือ PIN');
      return;
    }
    Alert.alert(
      'ส่งคำเชิญสำเร็จ',
      `ส่งคำเชิญไปยัง ${inviteEmail} แล้วค่ะ`,
      [{ text: 'ตกลง', onPress: () => setInviteEmail('') }]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'เจ้าของ', color: '#6C63FF' };
      case 'editor':
        return { label: 'แก้ไขได้', color: '#10B981' };
      case 'viewer':
        return { label: 'ดูอย่างเดียว', color: '#64748B' };
      default:
        return { label: role, color: '#64748B' };
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.headerIcon}>👥</Text>
        <Text style={styles.headerTitle}>ปฏิทินร่วม</Text>
        <Text style={styles.headerSubtitle}>
          แชร์ปฏิทินกับทีมหรือครอบครัว ให้ทุกคนเห็นตารางร่วมกัน
        </Text>
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          สมาชิก ({members.length} คน)
        </Text>
        <View style={styles.card}>
          {members.map((member, index) => {
            const badge = getRoleBadge(member.role);
            return (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index < members.length - 1 && styles.memberRowBorder,
                ]}
              >
                <View style={styles.memberAvatar}>
                  <Text style={{ fontSize: 24 }}>{member.avatar}</Text>
                  {member.isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: badge.color + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                {isAdmin && member.role !== 'owner' && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('จัดการสมาชิก', member.name, [
                        { text: 'เปลี่ยนสิทธิ์', onPress: () => {} },
                        { text: 'ลบออก', style: 'destructive', onPress: () => {} },
                        { text: 'ยกเลิก', style: 'cancel' },
                      ])
                    }
                  >
                    <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>⋯</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Invite Section */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เชิญสมาชิกใหม่</Text>
          <View style={styles.card}>
            <View style={styles.inviteRow}>
              <TextInput
                style={styles.inviteInput}
                placeholder="Email หรือ PIN ของสมาชิก"
                placeholderTextColor={COLORS.textSecondary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite}>
                <Text style={styles.inviteBtnText}>เชิญ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ตั้งค่าการแชร์</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>ปฏิทินสาธารณะ</Text>
              <Text style={styles.settingDesc}>
                ทุกคนที่มีลิงก์สามารถดูได้
              </Text>
            </View>
            <Switch
              value={sharePublic}
              onValueChange={setSharePublic}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
              thumbColor={sharePublic ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          {sharePublic && (
            <TouchableOpacity
              style={styles.copyLinkBtn}
              onPress={() => Alert.alert('คัดลอกแล้ว', 'ลิงก์ปฏิทินถูกคัดลอกแล้ว')}
            >
              <Text style={styles.copyLinkText}>🔗 คัดลอกลิงก์แชร์</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Feature Preview */}
      <View style={styles.section}>
        <View style={styles.previewCard}>
          <Text style={styles.previewIcon}>🚀</Text>
          <Text style={styles.previewTitle}>ฟีเจอร์ที่กำลังพัฒนา</Text>
          <Text style={styles.previewItem}>✅ แชร์ปฏิทินกับทีม</Text>
          <Text style={styles.previewItem}>✅ กำหนดสิทธิ์สมาชิก</Text>
          <Text style={styles.previewItem}>⏳ แจ้งเตือนเมื่อมีคนเพิ่มนัด</Text>
          <Text style={styles.previewItem}>⏳ ดูตารางว่างร่วมกัน</Text>
          <Text style={styles.previewItem}>⏳ Chat ภายในทีม</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerCard: {
    backgroundColor: '#6C63FF', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 24,
  },
  headerIcon: { fontSize: 48, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#E0DEFF', textAlign: 'center', lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  inviteRow: {
    flexDirection: 'row', gap: 10, padding: 16,
  },
  inviteInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  inviteBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  inviteBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  settingDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  copyLinkBtn: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  copyLinkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  previewCard: {
    backgroundColor: '#F0FDF4', borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: '#BBF7D0',
  },
  previewIcon: { fontSize: 32, marginBottom: 8 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  previewItem: { fontSize: 13, color: COLORS.text, lineHeight: 24 },
});

export default SharedCalendarScreen;
