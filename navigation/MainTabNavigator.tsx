// navigation/MainTabNavigator.tsx - UPDATED

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { CustomHeader } from '../components/CustomHeader';

import { Colors } from '../constants/Colors';
import { GraphScreen } from '../screens/GraphScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { RecordScreen } from '../screens/RecordScreen'; // Keep using RecordScreen
import { RootStackParamList } from './RootNavigator';

const HOST_BASE_URL = 'https://petlandia.cafecircuit.com/';
const DEFAULT_AVATAR = 'https://via.placeholder.com/150/94a3b8/0b1220?text=NO+IMG';

// Define the type for the user object (must match RootNavigator)
type User = RootStackParamList['Main']['user'];

// --- Type Definitions ---
export type TabParamList = {
  HomeTab: undefined;
  RecordTab: undefined;
};

// Define the Cat type here for type safety across screens
interface Cat {
  id: string;
  name: string;
  breed: string;
  birthdate: string;
  disease: string | null;
  image: string | null;
  normal_heartbeat: string | null;
}

// HomeStackParamList now includes 'Graph' and requires Cat data
export type HomeStackParamList = {
  Home: undefined;
  Graph: { cat: Cat }; 
};

const CAT_API_URL = 'https://petlandia.cafecircuit.com/API/CAT/display.php';
const RECORD_API_URL = 'https://petlandia.cafecircuit.com/API/RECORD/display.php';

interface HeartRecord {
  id: string;
  cat_id: string;
  heartbeat: string;
  recorded_at: string;
}

const isHeartbeatAbnormal = (bpm: number, normalHeartbeat: string | null | undefined) => {
  if (!normalHeartbeat) {
    return false;
  }

  const parts = normalHeartbeat.split('-');
  if (parts.length !== 2) {
    return false;
  }

  const min = parseInt(parts[0].trim(), 10);
  const max = parseInt(parts[1].trim(), 10);

  if (isNaN(min) || isNaN(max)) {
    return false;
  }

  return bpm < min || bpm > max;
};

const AbnormalMonitor: React.FC<{ ownerId: number }> = ({ ownerId }) => {
  const [cats, setCats] = useState<Cat[]>([]);
  const lastNotifiedPerCatRef = useRef<{ [catId: string]: number | null }>({});

  useEffect(() => {
    const requestNotificationPermissions = async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.status !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Notification permissions not granted');
          }
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('abnormal-heartbeat', {
            name: 'Abnormal Heartbeat Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'alarm.mp3',
            vibrationPattern: [0, 500, 500, 500],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    };

    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const response = await fetch(`${CAT_API_URL}?owner_id=${ownerId}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setCats(data.data as Cat[]);
        } else {
          setCats([]);
        }
      } catch (error) {
        console.error('AbnormalMonitor fetchCats error:', error);
      }
    };

    fetchCats();
    const intervalId = setInterval(fetchCats, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [ownerId]);

  useEffect(() => {
    if (!cats.length) {
      return;
    }

    const poll = async () => {
      for (const cat of cats) {
        if (!cat.normal_heartbeat) {
          continue;
        }

        try {
          const response = await fetch(`${RECORD_API_URL}?cat_id=${cat.id}`);
          const data = await response.json();

          if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
            continue;
          }

          const records: HeartRecord[] = data.data;
          const lastRecord = records[records.length - 1];
          const currentBPM = parseInt(lastRecord.heartbeat, 10);

          if (isNaN(currentBPM)) {
            continue;
          }

          if (!isHeartbeatAbnormal(currentBPM, cat.normal_heartbeat)) {
            continue;
          }

          const lastNotified = lastNotifiedPerCatRef.current[cat.id];
          if (lastNotified === currentBPM) {
            continue;
          }

          lastNotifiedPerCatRef.current[cat.id] = currentBPM;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Abnormal Heartbeat Detected',
              body: `${cat.name}'s latest heartbeat is ${currentBPM} BPM, which is outside the normal range (${cat.normal_heartbeat}).`,
              data: {
                bpm: currentBPM,
                catId: cat.id,
              },
              sound: 'alarm.mp3',
            },
            trigger: null,
          });
        } catch (error) {
          console.error('AbnormalMonitor poll error:', error);
        }
      }
    };

    poll();
    const intervalId = setInterval(poll, 30000);
    return () => clearInterval(intervalId);
  }, [cats]);

  return null;
};

type MainTabNavigatorProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

// --- Component Definitions ---

const Tab = createBottomTabNavigator<TabParamList>(); 
const HomeStack = createNativeStackNavigator<HomeStackParamList>(); 

// 1. HomeStackNavigator (Wrapper for HomeScreen and GraphScreen)
const HomeStackNavigator: React.FC<{ onLogout: () => void; user: User }> = ({ onLogout, user }) => {
  const imageUrl = user.image ? `${HOST_BASE_URL}${user.image}` : DEFAULT_AVATAR;
  
  // Debug logging for image URL construction
  console.log('MainTabNavigator - user.image:', user.image);
  console.log('MainTabNavigator - HOST_BASE_URL:', HOST_BASE_URL);
  console.log('MainTabNavigator - imageUrl:', imageUrl);

  const CustomHeaderComponent = () => (
    <CustomHeader
      userName={user.name}
      userImage={imageUrl}
      onLogout={onLogout}
    />
  );
  
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        options={{
          header: CustomHeaderComponent, // Use Custom Header
        }}
      >
        {/* Pass the owner's ID to HomeScreen */}
        {(props) => <HomeScreen {...props} ownerId={user.id} />} 
      </HomeStack.Screen>

      {/* Add GraphScreen to the HomeStack */}
      <HomeStack.Screen
        name="Graph"
        options={({ route }) => ({
            title: route.params.cat.name, // Set header title to cat's name
            headerBackTitle: 'Cats', // iOS back button text
            header: CustomHeaderComponent, // Use Custom Header
        })}
      >
        {/* Pass the cat data and owner data implicitly/explicitly */}
        {(props) => <GraphScreen {...props} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
};

// 2. Main Tab Navigator
export const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({ route }) => {
  const { onLogout, user } = route.params;

  // Default Header component for RecordTab
  const DefaultHeader = () => {
    const imageUrl = user.image ? `${HOST_BASE_URL}${user.image}` : DEFAULT_AVATAR;

    return (
      <CustomHeader
        userName={user.name}
        userImage={imageUrl}
        onLogout={onLogout}
      />
    );
  };

  return (
    <>
      <AbnormalMonitor ownerId={user.id} />
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'HomeTab') {
              iconName = 'home-outline';
            } else if (route.name === 'RecordTab') {
              iconName = 'time-outline'; // Changed icon to suggest history/records
            } else {
              iconName = 'help-circle-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: Colors.brand,
          tabBarInactiveTintColor: Colors.muted,
          
          // --- FLOATING TAB BAR STYLE ---
          tabBarStyle: {
            backgroundColor: Colors.panel,
            borderTopColor: 'transparent',
            height: 60,
            paddingBottom: 5,
            paddingTop: 5,
            
            // Floating properties
            position: 'absolute', 
            marginHorizontal: 15, 
            bottom: 10,
            borderRadius: 15, 
            shadowColor: Colors.bg, 
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 5,
            elevation: 10, 
          },
          tabBarBackground: () => (
              <></>
          ),
          
          // Only RecordTab needs the default header now
          header: DefaultHeader, 
        })}
      >
        <Tab.Screen
          name="HomeTab"
          options={{ title: 'Home', headerShown: false }}
        >
          {/* Use render function to pass user and onLogout to HomeStackNavigator */}
          {() => <HomeStackNavigator onLogout={onLogout} user={user} />}
        </Tab.Screen>

        {/* Updated RecordTab to pass ownerId and reflect its new purpose */}
        <Tab.Screen 
          name="RecordTab" 
          options={{ title: 'Records History' }}
        >
          {/* Pass ownerId to RecordScreen (which is now a historical viewer) */}
          {() => <RecordScreen ownerId={user.id} />}
        </Tab.Screen>

      </Tab.Navigator>
    </>
  );
};