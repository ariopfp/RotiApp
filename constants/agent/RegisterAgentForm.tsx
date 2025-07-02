import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { registerAsAgent } from '../../lib/appwrite';
import { useGlobalContext } from '../../lib/global-provider';

export const RegisterAgentForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refetch } = useGlobalContext();

  const handleSubmit = async () => {
    if (!storeName || !phoneNumber) {
      Alert.alert('Error', 'Nama toko dan nomor telepon wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await registerAsAgent(user?.$id || '', {
        storeName,
        phoneNumber
      });
      await refetch(); // Refresh data pengguna untuk memperbarui userType
      Alert.alert('Sukses', 'Pendaftaran agen berhasil! Anda akan diarahkan ke dasbor.');
      
      // Beri jeda singkat agar pengguna bisa membaca alert
      setTimeout(() => {
        onSuccess?.();
        router.replace('/(root)/(agent)/dashboard');
      }, 1000);

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mendaftar sebagai agen.');
      setLoading(false);
    } 
    // `setLoading(false)` tidak ditaruh di finally agar tombol tetap disabled setelah sukses.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daftar Sebagai Agen</Text>
      <Text style={styles.subtitle}>
        Lengkapi detail toko Anda untuk mulai berjualan di RotiApp.
      </Text>
      
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="storefront-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nama Toko Anda"
            value={storeName}
            onChangeText={setStoreName}
            placeholderTextColor="#6B7280"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nomor Telepon (cth: 0812...)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholderTextColor="#6B7280"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Daftar Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Rubik-Bold',
        color: '#1F2937',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#1F2937',
    },
    button: {
        backgroundColor: '#B69642',
        borderRadius: 99,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: '#A1A1AA',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Rubik-Bold',
    },
});
