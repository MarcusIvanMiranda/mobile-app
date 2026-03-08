// navigation/RootNavigator.tsx - FINAL CORRECTED VERSION

import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Colors } from '../constants/Colors';
import { LoginScreen } from '../screens/LoginScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { MainTabNavigator } from './MainTabNavigator';

// Define the type for the user object
type User = {
    id: number;
    name: string;
    email: string;
    image: string;
};

// Define types for navigation
export type RootStackParamList = {
  Login: undefined;
  Main: { onLogout: () => void; user: User };
  // ⚡️ CORRECTION HERE: Added 'token?' to allow a token to be passed from a deep link
  ResetPassword: { email?: string; token?: string }; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Define the custom dark theme
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.brand,
    background: Colors.bg,
    card: Colors.panel,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.red,
  },
};

export const RootNavigator = () => {
  const [user, setUser] = React.useState<User | null>(null);

  const handleLogin = (userData: User) => setUser(userData);

  const handleLogout = React.useCallback(() => setUser(null), []);

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator>
        {user ? (
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            initialParams={{ onLogout: handleLogout, user: user }} 
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Login"
              options={{ headerShown: false }}
            >
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>

            {/* NEW SCREEN ADDED */}
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ 
                title: 'Password Reset',
                presentation: 'modal', 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};