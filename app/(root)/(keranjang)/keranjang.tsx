import { config, databases, getCartItems } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router"; // Import useFocusEffect
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Models } from "react-native-appwrite";
import { SafeAreaView } from "react-native-safe-area-context";

// Tipe ini sekarang akan menerima produk "virtual" dari getCartItems
interface MergedCartItem extends Models.Document {
  product: {
    $id: string;
    name: string;
    image: string;
    price: number;
  };
}

const KeranjangItemCard = ({ item, refetchCart }: { item: MergedCartItem, refetchCart: () => void }) => {
  const { product } = item;
  
  const updateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem();
      return;
    }
    try {
      await databases.updateDocument(config.databaseId!, config.keranjangCollectionId!, item.$id, { quantity: newQuantity });
      refetchCart();
    } catch (error) {
      console.error("Gagal update kuantitas:", error);
    }
  };

  const handleRemoveItem = () => {
    Alert.alert(
      "Hapus Item",
      "Yakin ingin menghapus produk ini dari keranjang?",
      [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: async () => {
          try {
            await databases.deleteDocument(config.databaseId!, config.keranjangCollectionId!, item.$id);
            refetchCart();
          } catch (error) {
            console.error("Gagal menghapus item:", error);
          }
        }}
      ]
    );
  };
  
  if (!product) return <View className="h-32 justify-center items-center"><ActivityIndicator/></View>;

  return (
    <View style={styles.cardContainer}>
      <Image
        source={{ uri: product.image }}
        style={styles.cardImage}
      />
      <View style={styles.cardDetails}>
        <View>
          <Text style={styles.cardTitle} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.cardPrice}>Rp {product.price.toLocaleString('id-ID')}</Text>
        </View>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => updateQuantity(item.quantity - 1)} style={styles.quantityButton}>
            <Ionicons name="remove" size={18} color="#555" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.quantity + 1)} style={styles.quantityButton}>
            <Ionicons name="add" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={handleRemoveItem} style={styles.deleteButton}>
        <Ionicons name="close" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );
};

const KeranjangScreen = () => {
  const { user } = useGlobalContext();
  
  // PERBAIKAN UTAMA: Kita sekarang hanya butuh satu hook useAppwrite
  // Data yang dikembalikan sudah berisi detail produk, baik standar maupun kustom.
  const { data: cartItems, loading, refetch } = useAppwrite({
    fn: () => getCartItems(user!.$id),
    skip: !user,
  });

  // Memastikan keranjang di-refresh saat halaman menjadi fokus
  useFocusEffect(
    React.useCallback(() => {
      if(user) {
        refetch();
      }
    }, [user])
  );

  // Hitung total harga langsung dari data yang sudah digabung
  const totalHarga = useMemo(() => {
    if (!cartItems) return 0;
    return (cartItems as MergedCartItem[]).reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  if (!user) {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <Image source={require('@/assets/images/noResult.jpg')} style={styles.emptyImage} resizeMode="contain" />
        <Text style={styles.emptyTitle}>Anda Belum Masuk</Text>
        <Text style={styles.emptySubtitle}>Masuk untuk melihat keranjang belanja Anda.</Text>
        <TouchableOpacity onPress={() => router.push('/sign-in')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Masuk</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#191D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang Saya</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading && (!cartItems || cartItems.length === 0) ? (
        <View style={styles.fullCenter}><ActivityIndicator size="large" color="#B69642" /></View>
      ) : cartItems && cartItems.length === 0 ? (
        <View style={styles.fullCenter}>
          <Image source={require('@/assets/images/noResult.jpg')} style={styles.emptyImage} resizeMode="contain" />
          <Text style={styles.emptyTitle}>Keranjang Anda Kosong</Text>
          <Text style={styles.emptySubtitle}>Ayo, isi dengan produk-produk menarik!</Text>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Mulai Belanja</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartItems as MergedCartItem[]}
          keyExtractor={(item) => item.product.$id}
          renderItem={({ item }) => <KeranjangItemCard item={item} refetchCart={refetch} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {cartItems && cartItems.length > 0 && (
         <View style={styles.footer}>
            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Harga</Text>
                <Text style={styles.totalPrice}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/checkout', params: { total: totalHarga } })} 
              style={[styles.primaryButton, { marginTop: 16, width: '100%' }]}
            >
                <Text style={styles.primaryButtonText}>Lanjutkan ke Checkout</Text>
            </TouchableOpacity>
         </View>
      )}
    </SafeAreaView>
  );
};

// ... (Styles tetap sama)
const styles = StyleSheet.create({
    cardContainer: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 12,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardImage: { width: 90, height: 90, borderRadius: 12 },
    cardDetails: { flex: 1, marginLeft: 16, justifyContent: 'space-between' },
    cardTitle: { fontSize: 16, fontFamily: 'Rubik-Bold', color: '#191D31' },
    cardPrice: { fontSize: 18, fontFamily: 'Rubik-Bold', color: '#B69642', marginTop: 4 },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F1F1', borderRadius: 99 },
    quantityButton: { padding: 8 },
    quantityText: { fontSize: 16, fontFamily: 'Rubik-Medium', marginHorizontal: 12 },
    deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: 'white' },
    headerTitle: { fontSize: 22, fontFamily: 'Rubik-ExtraBold', color: '#191D31' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#EEE' },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 16, fontFamily: 'Rubik-Medium', color: '#666' },
    totalPrice: { fontSize: 24, fontFamily: 'Rubik-Bold', color: '#B69642' },
    primaryButton: { backgroundColor: '#B69642', paddingVertical: 16, borderRadius: 99, alignItems: 'center' },
    primaryButtonText: { color: 'white', fontSize: 16, fontFamily: 'Rubik-Bold' },
    fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 20 },
    emptyImage: { width: 200, height: 200, opacity: 0.8 },
    emptyTitle: { fontSize: 20, fontFamily: 'Rubik-Bold', color: '#333', marginTop: 16 },
    emptySubtitle: { fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center' }
  });

export default KeranjangScreen;