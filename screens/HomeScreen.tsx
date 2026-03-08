// screens/HomeScreen.tsx - FULL UPDATED WITH FIXED BATTERY ICON

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { CatCard } from '../components/CatCard';
import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/MainTabNavigator';

const STATUS_OPTIONS = [
    'Active',
    'Taking Shower',
    'Cleaning Harness',
    'Resting',
    'Feeding',
    'Other',
];

interface Cat {
    id: string;
    name: string;
    breed: string;
    birthdate: string;
    disease: string | null;
    image: string | null;
    normal_heartbeat: string | null;
    current_status: string | null;
}

type HomeScreenNavigationProps =
    NativeStackScreenProps<HomeStackParamList, 'Home'>['navigation'];

interface HomeScreenProps {
    ownerId: number;
}

const API_BASE_URL = 'http://petlandia.cafecircuit.com/API/CAT/display.php';
const API_SAVE_STATUS_URL = 'http://petlandia.cafecircuit.com/API/CAT/save_status.php';

export const HomeScreen: React.FC<HomeScreenProps> = ({ ownerId }) => {
    const navigation = useNavigation<HomeScreenNavigationProps>();
    const [cats, setCats] = useState<Cat[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [customStatus, setCustomStatus] = useState('');

    const [showBatteryDialog, setShowBatteryDialog] = useState(false);

    const [batteryPercentage, setBatteryPercentage] = useState(100);

    const fetchCats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}?owner_id=${ownerId}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setCats(data.data as Cat[]);
            } else {
                setCats([]);
                Alert.alert("Data Error", data.message || "Failed to load dog data.");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            Alert.alert("Network Error", "Could not connect to the API to fetch dog data.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedCat) return;

        let statusToSave = selectedStatus;
        if (selectedStatus === 'Other') {
            if (!customStatus.trim()) {
                Alert.alert("Input Required", "Please enter a status for 'Other'.");
                return;
            }
            statusToSave = customStatus.trim();
        }

        if (!statusToSave || statusToSave === 'Other') return;

        setIsSaving(true);

        try {
            const response = await fetch(API_SAVE_STATUS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cat_id: selectedCat.id,
                    status: statusToSave
                }),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("Success", `${selectedCat.name}'s status has been updated to: ${statusToSave}`);

                setCats(prevCats =>
                    prevCats.map(cat =>
                        cat.id === selectedCat.id ? { ...cat, current_status: statusToSave } : cat
                    )
                );
            } else {
                Alert.alert("Save Error", data.message || "Failed to log status.");
            }
        } catch (error) {
            console.error("Save Status Error:", error);
            Alert.alert("Network Error", "Could not connect to the API to save the status.");
        } finally {
            setIsSaving(false);
            setModalVisible(false);
            setSelectedCat(null);
            setSelectedStatus(null);
            setCustomStatus('');
        }
    };

    useEffect(() => {
        const INTERVAL_MS = 2 * 60 * 1000;
        const intervalId = setInterval(() => {
            setBatteryPercentage((prev) => {
                if (prev <= 0) {
                    return 0;
                }

                const next = prev - 1;

                if (prev > 20 && next === 20) {
                    Alert.alert("Battery Low", "Battery reached 20%. Please charge.");
                }

                if (next <= 0) {
                    clearInterval(intervalId);
                    return 0;
                }

                return next;
            });
        }, INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        fetchCats();
    }, [ownerId]);

    const handleCatPress = (cat: Cat) => {
        navigation.navigate('Graph', { cat: cat });
    };

    const handleLogStatus = (cat: Cat) => {
        setSelectedCat(cat);
        setSelectedStatus(cat.current_status || null);
        setCustomStatus(
            cat.current_status && !STATUS_OPTIONS.includes(cat.current_status)
                ? cat.current_status
                : ''
        );
        setModalVisible(true);
    };

    // FIXED: Icon rotates but container stays normal size (easy to press)
    const renderBatteryIcon = () => (
        <View>
            <Pressable
                style={styles.batteryIconContainer}
                onPress={() => setShowBatteryDialog(true)}
            >
                <MaterialIcons
                    name="battery-std"
                    size={30}
                    color={Colors.brand}
                    style={{ transform: [{ rotate: '270deg' }] }}
                />
            </Pressable>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showBatteryDialog}
                onRequestClose={() => setShowBatteryDialog(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Battery Percentage</Text>
                        <Text style={styles.modalSubtitle}>{batteryPercentage}%</Text>

                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setShowBatteryDialog(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );

    const renderStatusModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
                setModalVisible(false);
                setSelectedCat(null);
                setSelectedStatus(null);
                setCustomStatus('');
            }}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Set Status for {selectedCat?.name}</Text>
                    <Text style={styles.modalSubtitle}>Current: {selectedCat?.current_status || 'None'}</Text>

                    {STATUS_OPTIONS.map((status) => (
                        <Pressable
                            key={status}
                            style={[
                                styles.statusButton,
                                (selectedCat?.current_status === status || selectedStatus === status) &&
                                styles.statusButtonActive
                            ]}
                            onPress={() => {
                                if (selectedStatus === status) {
                                    setSelectedStatus(null);
                                } else {
                                    setSelectedStatus(status);
                                }
                            }}
                            disabled={isSaving}
                        >
                            <Text style={styles.statusButtonText}>{status}</Text>
                        </Pressable>
                    ))}

                    {selectedStatus === 'Other' && (
                        <TextInput
                            style={styles.customStatusInput}
                            placeholder="Enter custom status (e.g., 'At Vet')"
                            value={customStatus}
                            onChangeText={setCustomStatus}
                            placeholderTextColor={Colors.muted}
                        />
                    )}

                    <Pressable
                        style={[
                            styles.saveButton,
                            !selectedStatus && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={isSaving || !selectedStatus}
                    >
                        <Text style={styles.closeButtonText}>
                            {isSaving ? 'Saving...' : 'Save Status'}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.closeButton}
                        onPress={() => {
                            setModalVisible(false);
                            setSelectedCat(null);
                            setSelectedStatus(null);
                            setCustomStatus('');
                        }}
                        disabled={isSaving}
                    >
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </Pressable>

                    {isSaving && (
                        <ActivityIndicator
                            size="small"
                            color={Colors.brand}
                            style={{ marginTop: 10 }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.brand} />
                <Text style={styles.loadingText}>Loading dogs...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderStatusModal()}
            {renderBatteryIcon()}

            <Text style={styles.title}>Your Registered dogs</Text>

            {cats.length > 0 ? (
                <FlatList
                    data={cats}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <CatCard
                            cat={item}
                            onPress={handleCatPress}
                            onLogStatus={handleLogStatus}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.subtitle}>No dogs registered under your account.</Text>
                    <Text style={styles.bodyText}>Use the 'Record' tab to add a new dog.</Text>
                </View>
            )}
        </View>
    );
};

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
    listContent: {
        paddingBottom: 150,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.brand,
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.text,
        marginBottom: 10,
    },
    bodyText: {
        fontSize: 16,
        color: Colors.muted,
        textAlign: 'center',
    },
    loadingText: {
        color: Colors.muted,
        marginTop: 10,
    },

    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: Colors.panel,
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 5,
    },
    modalSubtitle: {
        fontSize: 16,
        color: Colors.muted,
        marginBottom: 20,
    },

    statusButton: {
        backgroundColor: Colors.brand,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        width: 200,
    },
    statusButtonActive: {
        backgroundColor: 'green',
        borderWidth: 2,
        borderColor: Colors.bg,
    },
    statusButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },

    customStatusInput: {
        backgroundColor: Colors.bg,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 15,
        width: 200,
        fontSize: 16,
    },

    saveButton: {
        marginTop: 5,
        backgroundColor: Colors.brand,
        borderRadius: 10,
        padding: 10,
        width: 200,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.muted,
    },

    closeButton: {
        marginTop: 10,
        backgroundColor: Colors.muted,
        borderRadius: 10,
        padding: 10,
        width: 200,
    },
    closeButtonText: {
        color: Colors.bg,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    // FIXED: Easier touch area + no rotation on container
    batteryIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        borderRadius: 25,
        backgroundColor: Colors.bg,
        elevation: 5,
        position: 'absolute',
        top: 1,
        right: 10,
    },
});

