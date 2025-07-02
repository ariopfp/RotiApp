import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import images from "@/constants/images";
import { createUser, loginUser } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";

export default function SignUp() {
  const router = useRouter();
  const { refetch } = useGlobalContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Semua kolom harus diisi.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password minimal harus 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await createUser(email, password, name);
      if (newUser) {
        await loginUser(email, password);
        await refetch();
        router.replace("/");
      }
    } catch (error: any) {
      Alert.alert("Error Pendaftaran", error.message || "Terjadi kesalahan saat mendaftar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Image
            source={images.logoawal}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Buat Akun Baru</Text>
          <Text style={styles.subtitle}>Mulai perjalanan belanja Anda di RotiApp</Text>

          {/* Form Inputs */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                placeholder="Nama Lengkap"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.inputContainer}>
               <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                style={styles.input}
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isSubmitting}
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Mendaftar...' : 'Daftar'}
            </Text>
          </TouchableOpacity>
          
          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => router.push('/sign-in')}>
              <Text style={[styles.footerText, styles.linkText]}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#B69642',
    borderRadius: 99,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#A1A1AA',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
  },
  linkText: {
    fontFamily: 'Rubik-Bold',
    color: '#B69642',
  },
});