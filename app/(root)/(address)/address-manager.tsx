import { addUserAddress, deleteUserAddress, getUserAddresses } from '@/lib/appwrite'
import { useGlobalContext } from '@/lib/global-provider'
import { useAppwrite } from '@/lib/useAppwrite'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import MapView, { MapPressEvent, Marker } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'

type Address = {
    label: string;
    detail: string;
    latitude?: number;
    longitude?: number;
};

const AddressManagerScreen = () => {
    const { user } = useGlobalContext();
    const { fromCheckout } = useLocalSearchParams();

    const { data: addresses, loading, refetch } = useAppwrite({
        fn: () => getUserAddresses(user!.$id),
        skip: !user
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [newAddressLabel, setNewAddressLabel] = useState('');
    const [newAddressDetail, setNewAddressDetail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    // Ambil lokasi saat ini
    const getCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin lokasi ditolak');
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setSelectedLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        });
    };

    const handleSelectAddress = (address: Address) => {
        if (fromCheckout) {
            router.back();
        } else {
            // Edit alamat
            setEditMode(true);
            setEditingAddress(address);
            setNewAddressLabel(address.label);
            setNewAddressDetail(address.detail);
            setSelectedLocation(
                address.latitude != null && address.longitude != null
                    ? { latitude: Number(address.latitude), longitude: Number(address.longitude) }
                    : null
            );
            setModalVisible(true);
        }
    };

    const handleAddAddress = async () => {
        if (!newAddressLabel || !newAddressDetail) {
            Alert.alert("Error", "Label dan Detail alamat tidak boleh kosong.");
            return;
        }
        if (!selectedLocation) {
            Alert.alert("Error", "Silakan pilih lokasi di peta atau gunakan lokasi GPS.");
            return;
        }
        setIsSaving(true);
        try {
            await addUserAddress(user!.$id, {
                label: newAddressLabel,
                detail: newAddressDetail,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
            });
            setModalVisible(false);
            setNewAddressLabel('');
            setNewAddressDetail('');
            setSelectedLocation(null);
            refetch();
        } catch (error: any) {
            Alert.alert("Gagal Menyimpan", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEditAddress = async () => {
        if (!editingAddress) return;
        if (!newAddressLabel || !newAddressDetail) {
            Alert.alert("Error", "Label dan Detail alamat tidak boleh kosong.");
            return;
        }
        if (!selectedLocation) {
            Alert.alert("Error", "Silakan pilih lokasi di peta atau gunakan lokasi GPS.");
            return;
        }
        setIsSaving(true);
        try {
            // Hapus alamat lama, lalu tambah alamat baru (jika tidak ada API update)
            await deleteUserAddress(user!.$id, editingAddress);
            await addUserAddress(user!.$id, {
                label: newAddressLabel,
                detail: newAddressDetail,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
            });
            setModalVisible(false);
            setEditMode(false);
            setEditingAddress(null);
            setNewAddressLabel('');
            setNewAddressDetail('');
            setSelectedLocation(null);
            refetch();
        } catch (error: any) {
            Alert.alert("Gagal Menyimpan", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAddress = (address: Address) => {
        Alert.alert("Hapus Alamat", `Yakin ingin menghapus alamat "${address.label}"?`, [
            { text: "Batal", style: "cancel" },
            { text: "Hapus", style: "destructive", onPress: async () => {
                try {
                    await deleteUserAddress(user!.$id, address);
                    refetch();
                } catch (error: any) {
                    Alert.alert("Gagal Menghapus", error.message);
                }
            }}
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={28} color="#191D31" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pilih Alamat</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? <ActivityIndicator size="large" style={{marginTop: 50}}/> : (
                <FlatList
                    data={addresses}
                    keyExtractor={(item) => item.label + item.detail}
                    renderItem={({ item }: { item: Address }) => (
                        <TouchableOpacity style={styles.addressCard} onPress={() => handleSelectAddress(item)}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="location-sharp" size={24} color="#B69642"/>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addressLabel}>{item.label}</Text>
                                <Text style={styles.addressDetail}>{item.detail}</Text>
                                {item.latitude != null && item.longitude != null && (
                                 <Text style={styles.coordText}>
                                    Koordinat: {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
                                 </Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteAddress(item)} style={{padding: 8}}>
                                <Ionicons name="trash-outline" size={22} color="#E53935"/>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    ListFooterComponent={
                        <TouchableOpacity style={styles.addButton} onPress={() => {
                            setEditMode(false);
                            setEditingAddress(null);
                            setNewAddressLabel('');
                            setNewAddressDetail('');
                            setSelectedLocation(null);
                            setModalVisible(true);
                        }}>
                            <Ionicons name="add" size={24} color="white"/>
                            <Text style={styles.addButtonText}>Tambah Alamat Baru</Text>
                        </TouchableOpacity>
                    }
                    contentContainerStyle={{ padding: 20 }}
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                    setEditMode(false);
                    setEditingAddress(null);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>{editMode ? 'Edit Alamat' : 'Alamat Baru'}</Text>
                        {/* Map Picker */}
                        <View style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                            <MapView
                                style={{ flex: 1 }}
                                initialRegion={{
                                    latitude: selectedLocation?.latitude || -6.2,
                                    longitude: selectedLocation?.longitude || 106.816666,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                onPress={(e: MapPressEvent) => setSelectedLocation(e.nativeEvent.coordinate)}
                            >
                                {selectedLocation && (
                                    <Marker coordinate={selectedLocation} />
                                )}
                            </MapView>
                            <TouchableOpacity
                                style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', padding: 8, borderRadius: 8, elevation: 2, flexDirection: 'row', alignItems: 'center' }}
                                onPress={getCurrentLocation}
                            >
                                <Ionicons name="locate" size={20} color="#B69642" />
                                <Text style={{ marginLeft: 6, color: '#B69642', fontFamily: 'Rubik-Medium' }}>Lokasi Saya</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedLocation && (
                            <Text style={{ marginBottom: 8, color: '#B69642', fontFamily: 'Rubik-Regular' }}>
                                Koordinat: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                            </Text>
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Label (Contoh: Rumah, Kantor)"
                            value={newAddressLabel}
                            onChangeText={setNewAddressLabel}
                        />
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Detail Alamat Lengkap"
                            value={newAddressDetail}
                            onChangeText={setNewAddressDetail}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.saveButton, isSaving && {backgroundColor: '#AAB1A5'}]} 
                            onPress={editMode ? handleSaveEditAddress : handleAddAddress}
                            disabled={isSaving}
                        >
                            {isSaving ? <ActivityIndicator color="white"/> : <Text style={styles.saveButtonText}>{editMode ? 'Simpan Perubahan' : 'Simpan'}</Text>}
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.cancelButton} onPress={() => {
                            setModalVisible(false);
                            setEditMode(false);
                            setEditingAddress(null);
                        }}>
                            <Text style={styles.cancelButtonText}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
    headerTitle: { fontSize: 22, fontFamily: 'Rubik-ExtraBold', color: '#191D31' },
    addressCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
    iconContainer: { marginRight: 16, backgroundColor: '#EFF2ED', padding: 12, borderRadius: 99 },
    addressLabel: { fontSize: 16, fontFamily: 'Rubik-Bold', color: '#333' },
    addressDetail: { fontSize: 14, color: '#666', marginTop: 4 },
    coordText: { fontSize: 12, color: '#B69642', marginTop: 2 },
    addButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#B69642', padding: 16, borderRadius: 12, marginTop: 8 },
    addButtonText: { color: 'white', fontSize: 16, fontFamily: 'Rubik-Bold', marginLeft: 8 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontFamily: 'Rubik-Bold', marginBottom: 20 },
    input: { width: '100%', borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16 },
    saveButton: { backgroundColor: '#B69642', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
    saveButtonText: { color: 'white', fontSize: 16, fontFamily: 'Rubik-Bold' },
    cancelButton: { marginTop: 12, padding: 8 },
    cancelButtonText: { fontSize: 16, color: '#888' },
});

export default AddressManagerScreen;