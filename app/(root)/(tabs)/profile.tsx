import { logout } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Komponen Item Menu yang bisa digunakan kembali (tidak ada perubahan)
const MenuItem = ({ icon, title, onPress, isDestructive = false }: {
  icon: any; // `any` agar bisa menerima nama ikon dari Ionicons
  title: string;
  onPress?: () => void;
  isDestructive?: boolean;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.menuItem}>
    <View style={[styles.menuIcon, isDestructive && styles.menuIconDestructive]}>
      <Ionicons name={icon} size={22} color={isDestructive ? '#DC2626' : '#B69642'} />
    </View>
    <Text style={[styles.menuTitle, isDestructive && styles.menuTitleDestructive]}>
      {title}
    </Text>
    {!isDestructive && <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />}
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const { user, refetch } = useGlobalContext();

  // --- PERBAIKAN LOGIKA LOGOUT DI SINI ---
  const handleLogout = () => {
    // Menampilkan dialog konfirmasi kepada pengguna
    Alert.alert(
      "Logout",
      "Apakah Anda yakin ingin keluar dari akun Anda?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          // Menggunakan async/await di dalam `onPress`
          onPress: async () => {
            try {
              // Memanggil fungsi logout yang sudah diperbarui (menggunakan deleteSessions)
              await logout();
              
              // Merefresh state global untuk menghapus data pengguna
              await refetch();
              
              // Mengarahkan pengguna kembali ke halaman sign-in
              router.replace('/sign-in');

            } catch (error: any) {
              // Menampilkan pesan error jika logout gagal
              Alert.alert("Error", error.message || "Gagal untuk logout.");
            }
          }
        }
      ]
    );
  };
  
  const menuItemsAccount = [
    { title: "Detail Profil", icon: "person-circle-outline", route: "/profile-detail" },
    { title: "Keranjang", icon: "cart-outline", route: "/(keranjang)/keranjang" },
    { title: "Alamat Pengiriman", icon: "location-outline", route: "/address-manager" },
  ];
  
  const menuItemsApp = [
    { title: "Tentang Aplikasi", icon: "information-circle-outline", route: "/(about)/about" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* Profile Info Card */}
        <View className="flex flex-col items-center mt-8 mb-2">
          <Image
            source={{
              uri: !user?.avatar
                ? 'https://via.placeholder.com/150'
                : user.avatar,
            }}
            className="size-36 rounded-full"
          />
          <Text className="text-2xl font-rubik-bold mt-2">{user?.name}</Text>
        </View>
        
        {/* Agent Menu Card */}
        <View style={styles.menuCard}>
            {user?.userType === 'agent' ? (
                <MenuItem 
                icon="grid-outline" 
                title="Dashboard Agen" 
                onPress={() => router.push('/(root)/(agent)/dashboard')}
                />
            ) : (
                <MenuItem 
                icon="briefcase-outline" 
                title="Daftar Sebagai Agen" 
                onPress={() => router.push('/(root)/(agen-auth)/register')}
                />
            )}
        </View>

        {/* Account Menu Card */}
         <View style={styles.menuCard}>
            {menuItemsAccount.map((item, index) => (
                <React.Fragment key={item.title}>
                    <MenuItem 
                        icon={item.icon} 
                        title={item.title} 
                        onPress={() => router.push(item.route as any)}
                    />
                    {index < menuItemsAccount.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
            ))}
        </View>
        
         {/* App Menu Card */}
         <View style={styles.menuCard}>
            {menuItemsApp.map((item, index) => (
                <React.Fragment key={item.title}>
                    <MenuItem 
                        icon={item.icon} 
                        title={item.title} 
                        onPress={() => router.push(item.route as any)}
                    />
                     {index < menuItemsApp.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
            ))}
        </View>
        
        {/* Logout Card */}
        <View style={styles.menuCard}>
            <MenuItem 
                icon="log-out-outline" 
                title="Logout" 
                onPress={handleLogout} 
                isDestructive
            />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
    header: { paddingVertical: 16, alignItems: 'center' },
    headerTitle: { fontSize: 24, fontFamily: 'Rubik-Bold', color: '#1F2937' },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    profileTextContainer: { flex: 1, marginLeft: 16 },
    profileName: { fontSize: 20, fontFamily: 'Rubik-Bold', color: '#1F2937' },
    profileEmail: { fontSize: 14, fontFamily: 'Rubik-Regular', color: '#6B7280', marginTop: 4 },
    menuCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuIconDestructive: {
        backgroundColor: '#FEF2F2',
    },
    menuTitle: { flex: 1, fontSize: 16, fontFamily: 'Rubik-Medium', color: '#1F2937' },
    menuTitleDestructive: {
        color: '#DC2626',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 72, // 40 (icon width) + 16 (margin right) + 16 (padding)
    },
});

export default ProfileScreen;
