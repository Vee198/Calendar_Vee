import React from 'react';
import {
  NavigationContainer,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

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
        headerTintColor: '#1E40AF',
        headerTitleStyle: { color: '#1E40AF', fontWeight: '600' },
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
      icon: '🏖️',
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
      icon: '⚙️',
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
        headerTintColor: '#1E40AF',
        headerTitleStyle: { color: '#1E40AF', fontWeight: '600' },
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
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="CalendarStack"
        component={CalendarStackNavigator}
        options={{
          title: 'ปฏิทิน',
          tabBarLabel: 'ปฏิทิน',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'แดชบอร์ด',
          tabBarLabel: 'แดชบอร์ด',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📊</Text>
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
            <Text style={{ fontSize: 24, color }}>✅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AISecretary"
        component={AISecretaryScreen}
        options={{
          title: 'AI เลขา',
          tabBarLabel: 'AI เลขา',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>🤖</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MoreStack"
        component={MoreStackNavigator}
        options={{
          title: 'เพิ่มเติม',
          tabBarLabel: 'เพิ่มเติม',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>⋯</Text>
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
    backgroundColor: '#FFFFFF',
  },
  menuContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  menuContent: {
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  menuArrow: {
    fontSize: 18,
    color: '#94A3B8',
  },
});

export default AppNavigator;
