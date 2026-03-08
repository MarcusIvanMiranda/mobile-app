import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/MainTabNavigator';

const screenWidth = Dimensions.get('window').width;
const SUCCESS_COLOR = '#4BB543';
const ERROR_COLOR = '#FF3333';
const Y_AXIS_WIDTH = 50; 

// Types
interface Record {
  id: string;
  cat_id: string;
  heartbeat: string;
  recorded_at: string;
  possible_diseases?: string | null;
}

type GraphScreenProps = NativeStackScreenProps<HomeStackParamList, 'Graph'>;

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${dd}/${mm}/${yy} : ${hours}:${minutes} ${ampm}`;
};

// --- Component: HeartbeatGraph ---
interface HeartbeatGraphProps {
  data: Record[];
}

const fmtTimeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const HeartbeatGraph: React.FC<HeartbeatGraphProps> = ({ data }) => {
  const scrollViewRef = React.useRef<ScrollView | null>(null);
  
  const sortedData = [...data].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const displayData = sortedData.slice(-50).reverse(); // Reverse to show newest data first
  const heartbeats = displayData.map((r) => {
    const v = parseInt(r.heartbeat);
    return isNaN(v) ? 0 : v;
  });
  const labels = displayData.map((r) => fmtTimeLabel(r.recorded_at));

  // Compute chart bounds so 1 segment == 1 BPM and latest value is centered within the spread
  const validData = heartbeats.filter((v) => !isNaN(v) && v !== 0);
  let chartMax = 100;
  let chartMin = 96;

  if (validData.length > 0) {
    const latestValue = validData[validData.length - 1];
    // Use a +/-2 spread by default; adjust as needed
    chartMax = latestValue + 2;
    chartMin = latestValue - 2;
    // Ensure sensible floor/ceiling
    if (chartMin < 30) chartMin = 30;
    if (chartMax < chartMin + 2) chartMax = chartMin + 2;
  }

  // Ensure integer bounds
  chartMax = Math.ceil(chartMax);
  chartMin = Math.floor(chartMin);

  // chart width: leave Y axis width reserved and allow scrolling if many points
  const chartWidth = Math.max(screenWidth - Y_AXIS_WIDTH - 30, displayData.length * 50);

  const commonChartConfig = {
    backgroundGradientFrom: Colors.panel,
    backgroundGradientTo: Colors.panel,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.brand },
  };

  if (displayData.length === 0) {
    return <Text style={styles.chartNoDataText}>No data available.</Text>;
  }

  // Build two-dataset payload: real data + invisible min/max dataset to force exact scaling
  const chartData = {
    labels,
    datasets: [
      {
        data: heartbeats,
        color: (opacity = 1) => `rgba(0,122,255,${opacity})`,
        strokeWidth: 2,
      },
      // Invisible dataset to force min/max -> prevents the chart from auto-scaling slightly differently
      {
        data: [chartMin, chartMax],
        color: () => 'rgba(0,0,0,0)',
        strokeWidth: 0,
        withDots: false,
      },
    ],
  };

  return (
    <View style={styles.card}>
      <Text style={styles.chartTitle}>Heartbeat Trend</Text>
      
      <View style={styles.combinedChartWrapper}>
        {/* FIXED Y-AXIS */}
        <View style={styles.staticYAxisContainer}>
          <LineChart
            data={{ 
              labels: [], 
              datasets: [{ data: [chartMin, chartMax] }] // Force the exact scale
            }}
            width={Y_AXIS_WIDTH + 20}
            height={220}
            chartConfig={commonChartConfig}
            fromZero={false}
            fromNumber={chartMax}
            segments={chartMax - chartMin} // one segment per BPM
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLabels={true}
            withVerticalLabels={false}
            withDots={false}
            style={styles.yAxisOverlay}
          />
        </View>

        {/* SCROLLABLE DATA */}
        <ScrollView
          horizontal
          ref={scrollViewRef}
          onContentSizeChange={() => {
            // Scroll to the end (newest data) when content loads
            if (scrollViewRef.current) {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
          style={styles.chartScrollView}
          contentContainerStyle={{ width: chartWidth }}
          showsHorizontalScrollIndicator={false}
        >
          <LineChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={commonChartConfig}
            // Disable bezier for pixel-perfect vertical alignment of dots vs grid
            bezier={false}
            fromZero={false}
            // Use explicit segment count so 1 segment == 1 BPM
            segments={chartMax - chartMin}
            withHorizontalLabels={false}
            withInnerLines={true}
            yAxisInterval={1}
            style={styles.scrollableChart}
          />
        </ScrollView>
      </View>
    </View>
  );
};

// --- Main Screen ---
const API_BASE_URL = 'http://petlandia.cafecircuit.com/';
const RECORD_API_URL = `${API_BASE_URL}API/RECORD/display.php`;

export const GraphScreen: React.FC<GraphScreenProps> = ({ route }) => {
  const cat = route.params?.cat;
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    if (!cat?.id) return;
    try {
      const response = await fetch(`${RECORD_API_URL}?cat_id=${cat.id}`);
      const data = await response.json();
      if (data.success) setRecords(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const id = setInterval(fetchRecords, 60000);
    return () => clearInterval(id);
  }, [cat?.id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand} /></View>;

  const lastRecord = records[records.length - 1];
  const currentBPM = lastRecord ? parseInt(lastRecord.heartbeat) : null;
  
  // Parse the cat's normal heartbeat range
  const [minBPM, maxBPM] = cat?.normal_heartbeat 
    ? cat.normal_heartbeat.split(/[-–—]/).map((s: string) => parseInt(s.trim())) // Handle regular hyphen, en-dash, and em-dash
    : [95, 135]; // fallback values
  
    
  const isAbnormal = currentBPM && (!isNaN(minBPM) && !isNaN(maxBPM) 
    ? (currentBPM < minBPM || currentBPM > maxBPM)
    : (currentBPM < 95 || currentBPM > 135));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Image source={{ uri: `${API_BASE_URL}${cat?.image}` }} style={styles.catImage} />
        <View style={styles.details}>
          <Text style={styles.catName}>{cat?.name}</Text>
          <Text style={styles.catDetail}>Breed: {cat?.breed}</Text>
          <Text style={styles.catDetail}>Normal BPM: {cat?.normal_heartbeat}</Text>
        </View>
      </View>

      <HeartbeatGraph data={records} />

      <View style={styles.card}>
        <Text style={styles.latestBPMTitle}>Latest Heartbeat</Text>
        <Text style={styles.latestBPMValue}>{currentBPM || '--'}<Text style={styles.bpmUnit}> BPM</Text></Text>
        <Text style={[styles.statusText, { color: isAbnormal ? ERROR_COLOR : SUCCESS_COLOR }]}>
          {isAbnormal ? 'Abnormal Heartbeat' : 'Normal Heartbeat'}
        </Text>
        {lastRecord && <Text style={styles.updatedText}>Last reading: {fmtDateTime(lastRecord.recorded_at)}</Text>}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', backgroundColor: Colors.panel, padding: 15, borderRadius: 10, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  catImage: { width: 80, height: 80, borderRadius: 40, marginRight: 15, borderWidth: 2, borderColor: Colors.brand },
  details: { flex: 1 },
  catName: { fontSize: 22, fontWeight: 'bold', color: Colors.brand },
  catDetail: { fontSize: 14, color: Colors.text },
  card: { backgroundColor: Colors.panel, borderRadius: 10, padding: 15, marginBottom: 15, elevation: 4, borderWidth: 1, borderColor: Colors.border },
  latestBPMTitle: { fontSize: 16, color: Colors.muted, textAlign: 'center' },
  latestBPMValue: { fontSize: 48, fontWeight: 'bold', textAlign: 'center', color: Colors.text },
  bpmUnit: { fontSize: 20, color: Colors.muted },
  statusText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  updatedText: { fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: 5 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: Colors.text },
  combinedChartWrapper: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  staticYAxisContainer: { width: Y_AXIS_WIDTH, backgroundColor: Colors.panel, zIndex: 10, paddingTop: 10 },
  yAxisOverlay: { marginLeft: -15 },
  chartScrollView: { flex: 1 },
  scrollableChart: { marginVertical: 8, borderRadius: 10, marginLeft: -15 },
  chartNoDataText: { textAlign: 'center', color: Colors.muted, padding: 20 }
});