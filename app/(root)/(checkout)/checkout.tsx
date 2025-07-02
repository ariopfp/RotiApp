import {
  createOrder,
  getCartItems,
  getUserAddresses,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Models } from "react-native-appwrite";
import { SafeAreaView } from "react-native-safe-area-context";

interface MergedCartItem extends Models.Document {
  product: {
    $id: string;
    name: string;
    image: string;
    price: number;
  };
  quantity: number;
}

// Opsi Metode Pembayaran
const PAYMENT_METHODS = [
    { id: 'cod', name: 'COD (Cash On Delivery)', icon: 'wallet-outline' },
    { id: 'bank', name: 'Transfer Bank', icon: 'server-outline' },
    { id: 'ewallet', name: 'E-Wallet', icon: 'card-outline' },
];


const CheckoutScreen = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ 
    isDirectBuy?: "true",
    productId?: string,
    productName?: string,
    productImage?: string,
    productPrice?: string
  }>();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // State baru untuk metode pembayaran
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  
  const { data: addresses, refetch: refetchAddresses } = useAppwrite({
    fn: () => getUserAddresses(user!.$id),
    skip: !user,
  });

  const { data: cartItemsData, loading: cartLoading } = useAppwrite({
    fn: () => getCartItems(user!.$id),
    skip: !user || !!params.isDirectBuy,
  });

  const cartItems = useMemo(() => {
    if (params.isDirectBuy) {
      return [{
        product: {
          $id: params.productId!,
          name: params.productName!,
          image: params.productImage!,
          price: parseFloat(params.productPrice || '0'),
        },
        quantity: 1,
        isCustom: false,
      }];
    }
    return cartItemsData as MergedCartItem[];
  }, [params, cartItemsData]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) { refetchAddresses(); }
    }, [user])
  );

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0].detail);
    } else if (addresses && addresses.length === 0) {
      setSelectedAddress(null);
    }
  }, [addresses]);

  const { subtotal, biayaPengiriman, grandTotal } = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return { subtotal: 0, biayaPengiriman: 0, grandTotal: 0 };
    
    const sub = cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    const shipping = sub > 0 ? 10000 : 0;
    return { subtotal: sub, biayaPengiriman: shipping, grandTotal: sub + shipping };
  }, [cartItems]);

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert("Error", "Sesi Anda berakhir, silakan masuk kembali.");
      router.replace("/sign-in");
      return;
    }
    if (!selectedAddress) {
      Alert.alert("Alamat Kosong", "Pilih atau tambahkan alamat pengiriman.");
      return;
    }
    // Validasi metode pembayaran
    if (!selectedPaymentMethod) {
      Alert.alert("Metode Pembayaran", "Silakan pilih metode pembayaran.");
      return;
    }


    setIsPlacingOrder(true);
    try {
      // Anda bisa meneruskan `selectedPaymentMethod` ke fungsi createOrder jika diperlukan di backend
      const orderId = await createOrder(user.$id, selectedAddress, grandTotal, cartItems);
      router.replace({ pathname: "/order-confirmation", params: { orderId } });
    } catch (error: any) {
      Alert.alert("Gagal Membuat Pesanan", error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#191D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
              <TouchableOpacity
                style={styles.addressBox}
                onPress={() => router.push({ pathname: "/address-manager", params: { fromCheckout: 'true' } })}
              >
                <Ionicons name="location-outline" size={32} color="#B69642" style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  {selectedAddress ? (
                    <>
                      <Text style={styles.addressName}>{user?.name}</Text>
                      <Text style={styles.addressText} numberOfLines={2}>{selectedAddress}</Text>
                    </>
                  ) : (
                    <Text style={styles.addressText}>
                      Belum ada alamat. Ketuk untuk menambah.
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </TouchableOpacity>
            </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>
            {cartLoading && !params.isDirectBuy? <ActivityIndicator/> : (
                cartItems?.map(item => (
                    <View key={item.product.$id} style={styles.itemCard}>
                        <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                        <View style={styles.itemDetails}>
                            <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                            <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                        </View>
                        <Text style={styles.itemPrice}>Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}</Text>
                    </View>
                ))
            )}
          </View>

          {/* --- AWAL BAGIAN METODE PEMBAYARAN --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            <View style={styles.paymentMethodContainer}>
              {PAYMENT_METHODS.map(method => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === method.id && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={selectedPaymentMethod === method.id ? '#B69642' : '#666'} 
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    selectedPaymentMethod === method.id && styles.paymentMethodTextSelected
                  ]}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* --- AKHIR BAGIAN METODE PEMBAYARAN --- */}

          <View style={[styles.section, { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }]}>
              <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>Rp {subtotal.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Pengiriman</Text>
                <Text style={styles.summaryValue}>Rp {biayaPengiriman.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontFamily: 'Rubik-Bold' }]}>Total</Text>
                <Text style={[styles.summaryValue, { fontFamily: 'Rubik-Bold', fontSize: 18, color: '#B69642' }]}>Rp {grandTotal.toLocaleString('id-ID')}</Text>
              </View>
            </View>
        </View>
      </ScrollView>

       <View style={styles.footer}>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          style={[styles.primaryButton, (isPlacingOrder || !cartItems || cartItems.length === 0) && { backgroundColor: '#AAB1A5' }]}
          disabled={isPlacingOrder || !cartItems || cartItems.length === 0}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Buat Pesanan</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ... Stylesheet yang ada, dengan tambahan style untuk metode pembayaran
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 12,
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#EEE'
    },
    headerTitle: { fontSize: 22, fontFamily: 'Rubik-ExtraBold', color: '#191D31' },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 18, fontFamily: 'Rubik-Bold', color: '#333', marginBottom: 12 },
    addressBox: {
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 
    },
    addressName: { fontSize: 16, fontFamily: 'Rubik-Medium', color: '#333' },
    addressText: { fontSize: 14, color: '#666', marginTop: 4 },
    itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    itemImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#EEE' },
    itemDetails: { flex: 1, marginLeft: 12 },
    itemName: { fontSize: 16, fontFamily: 'Rubik-Medium', color: '#333'},
    itemQuantity: { fontSize: 14, color: '#888', marginTop: 2 },
    itemPrice: { fontSize: 16, fontFamily: 'Rubik-Bold', color: '#333'},
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 8,
    },
    summaryLabel: { fontSize: 16, color: '#666', fontFamily: 'Rubik-Regular' },
    summaryValue: { fontSize: 16, color: '#333', fontFamily: 'Rubik-Medium' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      padding: 20,
      paddingTop: 16,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: '#EEE'
    },
    primaryButton: {
      backgroundColor: '#B69642',
      paddingVertical: 16,
      borderRadius: 99,
      alignItems: 'center',
    },
    primaryButtonText: { color: 'white', fontSize: 16, fontFamily: 'Rubik-Bold' },

    // --- STYLE BARU UNTUK METODE PEMBAYARAN ---
    paymentMethodContainer: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 8,
      elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 
    },
    paymentMethodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#EEE',
      backgroundColor: '#F9F9F9'
    },
    paymentMethodSelected: {
      backgroundColor: '#E8F5E9',
      borderColor: '#B69642',
    },
    paymentMethodText: {
      marginLeft: 16,
      fontSize: 16,
      fontFamily: 'Rubik-Medium',
      color: '#666'
    },
    paymentMethodTextSelected: {
      color: '#B69642'
    }
  });

export default CheckoutScreen;