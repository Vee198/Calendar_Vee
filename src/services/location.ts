/**
 * Location-aware Service
 *
 * ให้บริการ:
 * - ดึงตำแหน่งปัจจุบัน
 * - คำนวณระยะทางระหว่าง 2 จุด
 * - ประมาณเวลาเดินทาง
 * - แจ้งเตือนเรื่องรถติด/เผื่อเวลา
 *
 * Dependencies:
 * npx expo install expo-location
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOME_LOCATION_KEY = 'home_location';
const LOCATION_ENABLED_KEY = 'location_enabled';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface TravelEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  suggestedDepartureTime: string;
  tips: string[];
}

// Request location permission
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      await AsyncStorage.setItem(LOCATION_ENABLED_KEY, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Check if location is enabled
export async function isLocationEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(LOCATION_ENABLED_KEY);
  return val === 'true';
}

// Get current location
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

// Save home location
export async function saveHomeLocation(coords: Coordinates): Promise<void> {
  await AsyncStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(coords));
}

// Get home location
export async function getHomeLocation(): Promise<Coordinates | null> {
  const raw = await AsyncStorage.getItem(HOME_LOCATION_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
  const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * (Math.PI / 180)) *
      Math.cos(to.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel time (simple calculation)
function estimateTravelMinutes(distanceKm: number, isRushHour: boolean): number {
  // Average speed: rush hour ~20km/h, normal ~40km/h in Bangkok
  const avgSpeed = isRushHour ? 20 : 40;
  const travelMinutes = (distanceKm / avgSpeed) * 60;
  // Add buffer: 15 min for parking + walking
  return Math.ceil(travelMinutes) + 15;
}

// Check if time is rush hour (Bangkok)
function isRushHour(date: Date): boolean {
  const hour = date.getHours();
  return (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
}

// Get travel estimate for an event
export async function getTravelEstimate(
  eventLocation: string,
  eventTime: Date
): Promise<TravelEstimate | null> {
  const currentLocation = await getCurrentLocation();
  if (!currentLocation) return null;

  // Use geocoding to convert event location to coordinates
  // For now, provide a rough estimate based on common distances
  try {
    const geocoded = await Location.geocodeAsync(eventLocation);
    if (geocoded.length === 0) return null;

    const destination: Coordinates = {
      latitude: geocoded[0].latitude,
      longitude: geocoded[0].longitude,
    };

    const distanceKm = calculateDistance(currentLocation, destination);
    const rushHour = isRushHour(eventTime);
    const travelMinutes = estimateTravelMinutes(distanceKm, rushHour);

    const departureTime = new Date(eventTime.getTime() - travelMinutes * 60 * 1000);
    const tips: string[] = [];

    if (rushHour) {
      tips.push('ช่วงเวลานี้รถมักติด ควรเผื่อเวลาเพิ่ม');
    }
    if (distanceKm > 30) {
      tips.push('ระยะทางไกล ตรวจสอบน้ำมันให้เพียงพอ');
    }
    if (distanceKm > 50) {
      tips.push('เดินทางไกลมาก ควรเตรียมน้ำดื่มและของว่าง');
    }
    if (eventTime.getHours() >= 18) {
      tips.push('กลับดึก ระวังเรื่องแสงสว่างบนถนน');
    }

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedMinutes: travelMinutes,
      suggestedDepartureTime: departureTime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      tips,
    };
  } catch {
    return null;
  }
}

// Geocode an address to coordinates
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length > 0) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Reverse geocode coordinates to address
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    if (results.length > 0) {
      const r = results[0];
      return [r.name, r.street, r.district, r.city, r.region]
        .filter(Boolean)
        .join(', ');
    }
    return null;
  } catch {
    return null;
  }
}
