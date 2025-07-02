import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tipe data untuk profil agen
interface AgentProfile {
  name: string;
  phone: string;
  description?: string;
  address?: string;
}

// Komponen input yang bisa digunakan kembali
const FormInput = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: {
  label: string;
  value: string | undefined;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  </View>
);

export default function AgentSettings() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [profile, setProfile] = useState<AgentProfile>({
    name: '',
    phone: '',
    description: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || (user.userType !== 'agent' && user.userType !== 'admin')) {
      router.replace('/');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const doc = await databases.getDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        user.$id
      );
      setProfile({
        name: doc.name || '',
        phone: doc.phone || '',
        description: doc.description || '',
        address: doc.address || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!profile.name.trim() || !profile.phone.trim()) {
      Alert.alert('Error', 'Nama toko dan nomor telepon wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await databases.updateDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        user.$id,
        {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          description: profile.description?.trim() || '',
          address: profile.address?.trim() || '',
        }
      );
      Alert.alert('Sukses', 'Profil berhasil diperbarui!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };
  
  const setProfileValue = (key: keyof AgentProfile, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#B69642" />
        <Text style={styles.loadingText}>Memuat Pengaturan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Pengaturan Toko',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
            <FormInput 
                label="Nama Toko *"
                value={profile.name}
                onChangeText={(text) => setProfileValue('name', text)}
                placeholder="Masukkan nama toko Anda"
            />
            <FormInput 
                label="Nomor Telepon *"
                value={profile.phone}
                onChangeText={(text) => setProfileValue('phone', text)}
                placeholder="cth: 08123456789"
                keyboardType='phone-pad'
            />
             <FormInput 
                label="Deskripsi Toko"
                value={profile.description}
                onChangeText={(text) => setProfileValue('description', text)}
                placeholder="Jelaskan sedikit tentang toko Anda"
                multiline
            />
             <FormInput 
                label="Alamat Toko"
                value={profile.address}
                onChangeText={(text) => setProfileValue('address', text)}
                placeholder="Masukkan alamat lengkap toko"
                multiline
            />
            
            <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            >
                {saving ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Ionicons name="save-outline" size={18} color="white" />
                        <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontFamily: 'Rubik-Medium', color: '#6B7280' },
    scrollContainer: { paddingVertical: 16, paddingHorizontal: 20 },
    formContainer: { backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    inputGroup: { marginBottom: 20 },
    label: {
        fontSize: 14,
        fontFamily: 'Rubik-Medium',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#1F2937',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#B69642',
        paddingVertical: 16,
        borderRadius: 99,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    saveButtonDisabled: {
        backgroundColor: '#A1A1AA', // Warna saat disabled
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Rubik-Bold',
    },
});