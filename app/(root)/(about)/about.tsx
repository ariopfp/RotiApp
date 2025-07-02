import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import gambar logo
import images from '@/constants/images';

const AboutScreen = () => {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const appVersion = "1.0.0"; // Versi statis

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tentang Aplikasi</Text>
        <View style={{ width: 44 }} /> 
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Image
            source={images.logoawal}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>RotiApp</Text>
          <Text style={styles.versionText}>Versi {appVersion}</Text>

          <View style={styles.descriptionContainer}>
            {/* --- KONTEN BARU DARI ANDA --- */}
            <Text style={styles.descriptionText}>
              RotiApp adalah sebuah aplikasi e-commerce yang berfokus menjual roti.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Copyright © {currentYear} RotiApp. All Rights Reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
  },
  backButton: {
    padding: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 24,
  },
  descriptionContainer: {
    marginTop: 16,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 26, // Memberi jarak antar baris agar lebih mudah dibaca
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#9CA3AF',
  },
});

export default AboutScreen;
