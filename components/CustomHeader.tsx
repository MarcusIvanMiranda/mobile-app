import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

interface CustomHeaderProps {
  userName: string;
  userImage: string;
  onLogout: () => void;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({ userName, userImage, onLogout }) => {
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Debug logging for image
  console.log('CustomHeader - userImage:', userImage);

  // Menu item handler (only logout is functional)
  const handleMenuItemPress = (action: 'profile' | 'setting' | 'logout') => {
    setIsMenuOpen(false); // Close menu on press
    if (action === 'logout') {
      onLogout();
    } else {
      // Profile and Setting no function yet
      console.log(`${action} pressed`);
    }
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      {/* Left Side: User Image and Name */}
      <View style={styles.userInfo}>
        <Image
          source={{ uri: userImage }}
          style={styles.userImage}
        />
        <Text style={styles.userNameText}>{userName}</Text>
      </View>

      {/* Right Side: Menu Icon and Dropdown */}
      <View>
        <TouchableOpacity style={styles.menuIcon} onPress={() => setIsMenuOpen(!isMenuOpen)}>
          <Ionicons name="menu" size={28} color={Colors.text} />
        </TouchableOpacity>

        {isMenuOpen && (
          <View style={styles.menuDropdown}>
            {/* Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('profile')}
            >
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('setting')}
            >
              <Text style={styles.menuItemText}>Setting</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => handleMenuItemPress('logout')}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.panel,
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  menuIcon: {
    padding: 5,
  },
  menuDropdown: {
    position: 'absolute',
    top: 45, // Position below the menu icon
    right: 0,
    width: 150,
    // *** FIX APPLIED HERE: Changed from Colors['panel-2'] to the defined Colors.panel_2 ***
    backgroundColor: Colors.panel_2, 
    borderRadius: 8,
    zIndex: 10, // Ensure it's above other content
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 16,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  logoutItem: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  logoutText: {
    color: Colors.red,
    fontSize: 16,
    fontWeight: 'bold',
  },
});