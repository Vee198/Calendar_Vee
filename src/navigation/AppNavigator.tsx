import React from 'react';
import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Rect, Line, Path, Circle as SvgCircle, Polyline } from 'react-native-svg';

import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/theme';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import EventFormScreen from '../screens/EventFormScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AISecretaryScreen from '../screens/AISecretaryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HolidaysScreen from '../screens/HolidaysScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import SharedCalendarScreen from '../screens/SharedCalendarScreen';
import TaskScreen from '../screens/TaskScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

// Type definitions for navigation
export type RootStackParamList = {
  Login: undefined;
  MainApp: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  CalendarStack: NavigatorScreenParams<CalendarStackParamList>;
  Dashboard: undefined;
  Tasks: undefined;
  AISecretary: undefined;
  MoreStack: NavigatorScreenParams<MoreStackParamList>;
};

export type CalendarStackParamList = {
  CalendarScreen: undefined;
  EventDetail: { eventId: string };
  EventForm: { eventId?: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Feedback: undefined;
  Holidays: undefined;
  AuditLog: undefined;
  Settings: undefined;
  SharedCalendar: undefined;
};

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

// Calendar Stack Navigator
const CalendarStackNavigator: React.FC = () => {
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primaryLight,
        headerTitleStyle: { color: COLORS.text, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.background },
      }}
    >
      <CalendarStack.Screen
        name="CalendarScreen"
        component={CalendarScreen}
        options={{ title: 'ปฏิทิน' }}
      />
      <CalendarStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'รายละเอียดเหตุการณ์' }}
      />
      <CalendarStack.Screen
        name="EventForm"
        component={EventFormScreen}
        options={{ title: 'สร้าง/แก้ไขเหตุการณ์' }}
      />
    </CalendarStack.Navigator>
  );
};

// More Menu Screen Component
const MoreMenuScreen: React.FC<{
  navigation: any;
}> = ({ navigation }) => {
  const { isAdmin } = useAuth();

  const menuItems = [
    {
      label: 'Feedback / แจ้งปัญหา',
      icon: '💬',
      onPress: () => navigation.navigate('Feedback'),
    },
    {
      label: 'ปฏิทินร่วม',
      icon: '👥',
      onPress: () => navigation.navigate('SharedCalendar'),
    },
    {
      label: 'วันหยุด',
      icon: '🏖',
      onPress: () => navigation.navigate('Holidays'),
    },
    ...(isAdmin
      ? [
          {
            label: 'บันทึกการเปลี่ยนแปลง',
            icon: '📋',
            onPress: () => navigation.navigate('AuditLog'),
          },
        ]
      : []),
    {
      label: 'ตั้งค่า',
      icon: '⚙',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <View style={styles.menuContainer}>
      <ScrollView contentContainerStyle={styles.menuContent}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// More Stack Navigator
const MoreStackNavigator: React.FC = () => {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primaryLight,
        headerTitleStyle: { color: COLORS.text, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.background },
      }}
    >
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ title: 'เพิ่มเติม' }}
      />
      <MoreStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: 'Feedback' }}
      />
      <MoreStack.Screen
        name="Holidays"
        component={HolidaysScreen}
        options={{ title: 'วันหยุด' }}
      />
      <MoreStack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{ title: 'บันทึกการเปลี่ยนแปลง' }}
      />
      <MoreStack.Screen
        name="SharedCalendar"
        component={SharedCalendarScreen}
        options={{ title: 'ปฏิทินร่วม' }}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'ตั้งค่า' }}
      />
    </MoreStack.Navigator>
  );
};

// Main Tab Navigator (shown when authenticated)
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarStyle: {
          backgroundColor: COLORS.tabBarBg,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="CalendarStack"
        component={CalendarStackNavigator}
        options={{
          title: 'ปฏิทิน',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
              <Rect x={3} y={4} width={18} height={18} rx={2} />
              <Line x1={16} y1={2} x2={16} y2={6} />
              <Line x1={8} y1={2} x2={8} y2={6} />
              <Line x1={3} y1={10} x2={21} y2={10} />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'แดชบอร์ด',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
              <Rect x={3} y={3} width={7} height={7} rx={1} />
              <Rect x={14} y={3} width={7} height={7} rx={1} />
              <Rect x={3} y={14} width={7} height={7} rx={1} />
              <Rect x={14} y={14} width={7} height={7} rx={1} />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskScreen}
        options={{
          title: 'Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
              <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <Polyline points="22 4 12 14.01 9 11.01" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="AISecretary"
        component={AISecretaryScreen}
        options={{
          title: 'AI',
          tabBarLabel: 'AI',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
              <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="MoreStack"
        component={MoreStackNavigator}
        options={{
          title: 'เพิ่มเติม',
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
              <SvgCircle cx={12} cy={12} r={1.5} />
              <SvgCircle cx={19} cy={12} r={1.5} />
              <SvgCircle cx={5} cy={12} r={1.5} />
            </Svg>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator - Main entry point
const AppNavigator: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {token ? (
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  menuContent: {
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
});

export default AppNavigator;
