// screens/RecordScreen.tsx - UPDATED (Added "Show All" filtering & hosted API URLs)

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';

// --- Type Definitions ---
interface Cat {
  id: string;
  name: string;
  normal_heartbeat: string | null;
}

interface Record {
  id: string;
  cat_id: string;
  heartbeat: string;
  recorded_at: string;
}

interface RecordScreenProps {
  ownerId: number;
}

// Updated to include 'all'
type FilterType = 'day' | 'week' | 'month' | 'year' | 'all';

// --- API URLs ---
// Use local IP for API
const API_BASE_URL = 'http://petlandia.cafecircuit.com/';

const CAT_API_URL = `${API_BASE_URL}API/CAT/display.php`;
const RECORD_API_URL = `${API_BASE_URL}API/RECORD/app_display.php`;

// --- Utility Functions ---
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${dd}/${mm}/${yy} : ${hours}:${minutes} ${ampm}`;
};

const fmtDateOnly = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

// --- Main Component ---
export const RecordScreen: React.FC<RecordScreenProps> = ({ ownerId }) => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [normalHeartbeatRange, setNormalHeartbeatRange] = useState<string>('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering state
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${CAT_API_URL}?owner_id=${ownerId}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setCats(data.data);
        const firstCat = data.data[0];
        setSelectedCatId(firstCat.id);
        setNormalHeartbeatRange(firstCat.normal_heartbeat || '');
      } else {
        setCats([]);
        setSelectedCatId('');
        setNormalHeartbeatRange('');
      }
    } catch (error) {
      console.error('Fetch Dogs Error:', error);
      Alert.alert('Network Error', 'Could not connect to the API to fetch dogs.');
    }
    // loading handled in effects
  };

  const fetchRecords = async (catId: string, type: FilterType, startDate: Date) => {
    if (!catId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `${RECORD_API_URL}?cat_id=${catId}`;

      // Only append date filters when not "all"
      if (type !== 'all') {
        const formattedDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        url += `&filter_type=${type}&start_date=${formattedDate}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setRecords(data.data.reverse());
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Fetch Records Error:', error);
      Alert.alert('Network Error', 'Could not fetch heartbeat records.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch cats on initial load
  useEffect(() => {
    fetchCats();
  }, [ownerId]);

  // 2. Fetch records when selectedCatId, filterType, or selectedDate changes
  useEffect(() => {
    if (selectedCatId) {
      fetchRecords(selectedCatId, filterType, selectedDate);
    } else {
      if (!loading && cats.length === 0) {
        setRecords([]);
      }
    }
  }, [selectedCatId, cats.length, filterType, selectedDate]);

  // --- Handlers ---
  const handleCatChange = (itemValue: string) => {
    const cat = cats.find((c) => c.id === itemValue);

    setSelectedCatId(itemValue);
    setNormalHeartbeatRange(cat?.normal_heartbeat || '');
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // --- Renderers ---
  const renderRecordItem = ({ item }: { item: Record }) => {
    const heartbeat = parseInt(item.heartbeat);
    const [minBPM, maxBPM] = normalHeartbeatRange
      .split(/[-–—]/) // Handle regular hyphen, en-dash, and em-dash
      .map((s: string) => parseInt(s.trim()));

    let status = 'Normal';
    let statusColor = '#4BB543';

    if (!isNaN(minBPM) && !isNaN(maxBPM)) {
      if (heartbeat >= minBPM && heartbeat <= maxBPM) {
        status = 'Normal';
        statusColor = '#4BB543';
      } else {
        status = heartbeat < minBPM ? 'Low' : 'High';
        statusColor = '#FF3333';
      }
    } else {
      // Fallback logic when normal range is not available
      if (heartbeat < 95) {
        status = 'Low';
        statusColor = '#FF3333';
      } else if (heartbeat > 135) {
        status = 'High';
        statusColor = '#FF3333';
      } else {
        status = 'Normal';
        statusColor = '#4BB543';
      }
    }

    return (
      <View style={styles.recordItem}>
        <View style={styles.recordTimeContainer}>
          <Ionicons name="time-outline" size={16} color={Colors.muted} />
          <Text style={styles.recordTime}>{fmtDateTime(item.recorded_at)}</Text>
        </View>
        <Text style={styles.recordBPM}>
          {heartbeat} <Text style={styles.recordBPMUnit}>BPM</Text>
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
    );
  };

  // --- UI Logic ---
  if (loading && cats.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.brand} />
        <Text style={styles.loadingText}>Loading dogs...</Text>
      </View>
    );
  }

  if (cats.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>No Dogs Found</Text>
        <Text style={styles.loadingText}>Please register a dog first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historical Heartbeat Records</Text>

      {/* Cat Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Dog:</Text>
        <Picker
          selectedValue={selectedCatId || ''}
          onValueChange={handleCatChange}
          style={styles.picker}
          itemStyle={styles.pickerItem}
          mode="dropdown"
        >
          {cats.map((cat) => (
            <Picker.Item
              key={cat.id}
              label={`${cat.name} (Normal: ${cat.normal_heartbeat || 'N/A'})`}
              value={cat.id}
            />
          ))}
        </Picker>
      </View>

      {/* Filter and Date Selector */}
      <View style={styles.filterRow}>
        <View style={styles.filterPickerContainer}>
          <Picker
            selectedValue={filterType}
            onValueChange={(itemValue) => setFilterType(itemValue as FilterType)}
            style={styles.filterPicker}
            itemStyle={styles.pickerItem}
            mode="dropdown"
          >
            <Picker.Item label="Show All" value="all" />
            <Picker.Item label="Day" value="day" />
            <Picker.Item label="Week" value="week" />
            <Picker.Item label="Month" value="month" />
            <Picker.Item label="Year" value="year" />
          </Picker>
        </View>

        {filterType !== 'all' && (
          <TouchableOpacity
            style={styles.dateSelectorButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.brand} />
            <Text style={styles.dateSelectorText}>{fmtDateOnly(selectedDate)}</Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={selectedDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* Records List / Loading / No Data */}
      {loading && selectedCatId ? (
        <View style={[styles.center, { height: 200 }]}>
          <ActivityIndicator size="small" color={Colors.brand} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : records.length > 0 ? (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={[styles.center, { height: 200 }]}>
          <Text style={styles.noDataText}>
            No historical records found for this dog for the selected period.
          </Text>
        </View>
      )}
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.muted,
    marginTop: 10,
  },
  noDataText: {
    color: Colors.muted,
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand,
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: Colors.panel,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pickerLabel: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 5,
    marginLeft: 5,
  },
  picker: {
    color: Colors.text,
  },
  pickerItem: {
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterPickerContainer: {
    flex: 1,
    backgroundColor: Colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
    height: 50,
    justifyContent: 'center',
  },
  filterPicker: {
    color: Colors.text,
    height: 50,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.panel,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 140,
    justifyContent: 'space-around',
  },
  dateSelectorText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 120,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.panel,
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    borderLeftWidth: 5,
    borderLeftColor: Colors.brand,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  recordTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 3,
  },
  recordTime: {
    fontSize: 14,
    color: Colors.muted,
    marginLeft: 5,
  },
  recordBPM: {
    flex: 1.5,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  recordBPMUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: Colors.muted,
  },
  statusBadge: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.panel,
  },
});