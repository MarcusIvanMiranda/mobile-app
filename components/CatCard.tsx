// components/CatCard.tsx - UPDATED UI, POSITIONING, and DATA

import { Ionicons } from '@expo/vector-icons'; // Import icons
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface Cat {
  id: string;
  name: string;
  breed: string;
  birthdate: string;
  disease: string | null;
  image: string | null;
  normal_heartbeat: string | null;
  // NEW: Add current status field
  current_status: string | null; 
}

interface CatCardProps {
  cat: Cat;
  onPress: (cat: Cat) => void;
  onLogStatus: (cat: Cat) => void; 
}

// Use local IP and CAPSTONE prefix for cat images
const API_BASE_URL = 'http://petlandia.cafecircuit.com/';

export const CatCard: React.FC<CatCardProps> = ({ cat, onPress, onLogStatus }) => {
  const imageUrl =
    cat.image && (cat.image.startsWith('http://') || cat.image.startsWith('https://'))
      ? cat.image
      : cat.image
        ? `${API_BASE_URL}${cat.image}`
        : 'https://via.placeholder.com/150/94a3b8/0b1220?text=NO+IMG';
  
  // Determine status color/display
  const status = cat.current_status || 'N/A';
  const isStatusActive = status === 'Active';
  // Highlight active status in green, brand color for other set status
  const statusColor = isStatusActive ? 'green' : (status === 'N/A' ? Colors.muted : Colors.brand);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card, 
        { opacity: pressed ? 0.95 : 1 }
      ]}
      onPress={() => onPress(cat)} 
    >
      <View style={styles.contentWrapper}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.catImage}
        />
        <View style={styles.detailsContainer}>
          <Text style={styles.nameText}>{cat.name}</Text>
          <Text style={styles.detailText}>Breed: {cat.breed}</Text>
          <Text style={styles.detailText}>DOB: {cat.birthdate}</Text>
          <Text style={styles.detailText}>Disease: {cat.disease || 'N/A'}</Text>
          <Text style={styles.detailText}>Normal HB: {cat.normal_heartbeat || 'N/A'}</Text>
          
          {/* Display Current Status */}
          <Text style={styles.statusText}>
            Status: <Text style={{ color: statusColor, fontWeight: 'bold' }}>{status}</Text>
          </Text>
        </View>
        
        {/* Status Log Button: TOP RIGHT POSITIONED AND SMALLER */}
        <Pressable 
          style={({ pressed }) => [
            styles.logButton, 
            { opacity: pressed ? 0.7 : 1 }
          ]}
          onPress={(e) => {
            // Stop the CatCard's onPress event from firing
            e.stopPropagation(); 
            onLogStatus(cat);
          }}
        >
          <Ionicons name="create-outline" size={18} color={Colors.bg} />
          <Text style={styles.logButtonText}></Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.panel,
    borderRadius: 10,
    padding: 15,
    paddingRight: 80, // Add padding to prevent content overlap with the button
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative', // IMPORTANT: Allows absolute positioning of children
  },
  catImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    backgroundColor: Colors.muted,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.muted,
  },
  statusText: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 5,
  },
  logButton: {
    backgroundColor: Colors.brand, 
    borderRadius: 8,
    position: 'absolute', 
    top: -10, // Adjusted to top edge
    right: -75, // Adjusted to right edge
    paddingVertical: 5, 
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: Colors.bg,
    fontSize: 10, // Smaller font size
    fontWeight: 'bold',
    marginLeft: 3,
  }
});