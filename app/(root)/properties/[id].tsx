import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import { addToCart, getPropertyById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";

const { height: windowHeight, width: windowWidth } = Dimensions.get("window");

const ProductDetail = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useGlobalContext();
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const { data: product, loading } = useAppwrite({
    fn: () => getPropertyById({ id: id! }),
    skip: !id,
  });

  const handleBuyNow = () => {
    if (!user) {
      Alert.alert("Perlu Login", "Anda harus masuk untuk membeli item.", [
        { text: "OK", onPress: () => router.push('/sign-in') }
      ]);
      return;
    }
    if (!product) return;

    router.push({
      pathname: '/(root)/(checkout)/checkout',
      params: {
        isDirectBuy: "true",
        productId: product.$id,
        productName: product.name,
        productImage: product.image,
        productPrice: product.price.toString(),
      }
    });
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert("Perlu Login", "Anda harus masuk untuk menambahkan item ke keranjang.", [
        { text: "OK", onPress: () => router.push('/sign-in') }
      ]);
      return;
    }
    if (!id) return;

    try {
      await addToCart(user.$id, id);
      Alert.alert("Sukses!", "Produk berhasil ditambahkan ke keranjang.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal menambahkan produk.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B69642" />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Produk tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header Gambar */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageModalVisible(true)}>
          <View style={[styles.imageContainer, { height: windowHeight * 0.5 }]}>
            <Image
              source={{ uri: product.image }}
              style={styles.image}
            />
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={24} color="#191D31" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(root)/(keranjang)/keranjang')} style={styles.iconButton}>
                <Ionicons name="cart-outline" size={24} color="#191D31" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Konten Detail */}
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.ratingContainer}>
              <Image source={icons.star} style={styles.starIcon} />
              <Text style={styles.ratingText}>
                {product.rating || 'N/A'} ({product.reviews?.length ?? 0} reviews)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.descriptionText}>
            {product.description}
          </Text>

          {/* ... (Sisa konten seperti Penjual, Galeri, Ulasan tetap sama) ... */}

        </View>
      </ScrollView>

      {/* Footer Aksi */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Harga</Text>
          <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
            Rp {product.price.toLocaleString('id-ID')}
          </Text>
        </View>
        {/* Tombol Tambah ke Keranjang */}
        <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
          <Ionicons name="cart-outline" size={20} color="#B69642" />
        </TouchableOpacity>
        {/* Tombol Beli Sekarang */}
        <TouchableOpacity style={styles.buyButton} onPress={handleBuyNow}>
          <Text style={styles.buyButtonText}>Beli Sekarang</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Gambar */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsImageModalVisible(false)}
        >
          <Image
            source={{ uri: product.image }}
            style={styles.modalImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsImageModalVisible(false)}
          >
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// --- STYLESHEET BARU ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20
    },
    errorText: {
        fontSize: 20,
        fontFamily: 'Rubik-Bold',
        color: '#333'
    },
    backButton: {
        marginTop: 20,
        backgroundColor: '#B69642',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 99,
    },
    backButtonText: {
        color: 'white',
        fontFamily: 'Rubik-Bold'
    },
    imageContainer: { width: '100%' },
    image: { width: '100%', height: '100%' },
    headerButtons: {
        position: 'absolute',
        top: Platform.OS === "ios" ? 60 : 40,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    iconButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    productName: {
        fontSize: 28,
        fontFamily: 'Rubik-Bold',
        color: '#191D31',
        flex: 1,
        marginRight: 12,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F1F1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
    },
    starIcon: { width: 16, height: 16, marginRight: 4 },
    ratingText: { fontFamily: 'Rubik-Medium', color: '#666' },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 24 },
    sectionTitle: { fontSize: 20, fontFamily: 'Rubik-Bold', color: '#191D31', marginBottom: 8 },
    descriptionText: {
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#666876',
        lineHeight: 26,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#F0F0F0',
        height: 90,
    },
    priceContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    priceLabel: { fontSize: 14, fontFamily: 'Rubik-Regular', color: '#666876' },
    priceText: {
        fontSize: 24,
        fontFamily: 'Rubik-ExtraBold',
        color: '#191D31',
    },
    cartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 99,
        marginLeft: 8,
        marginRight: 8,
    },
    cartButtonText: {
        color: '#B69642',
        fontSize: 16,
        fontFamily: 'Rubik-Bold',
        marginLeft: 6,
    },
    buyButton: {
        backgroundColor: '#B69642',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 99,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyButtonText: { color: 'white', fontSize: 16, fontFamily: 'Rubik-Bold' },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalImage: {
        width: windowWidth * 0.9,
        height: windowHeight * 0.6,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
    },
});

export default ProductDetail;