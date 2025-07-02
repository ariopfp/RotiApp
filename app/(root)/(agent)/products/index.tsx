import { ProductForm } from '@/constants/agent/ProductForm';
import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Product } from '@/types/product';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

// Komponen Kartu Produk untuk tampilan yang lebih rapi
const ProductCard = ({ product, onEdit, onDelete }: { product: Product, onEdit: () => void, onDelete: () => void }) => (
    <View style={styles.card}>
        <Image source={{ uri: product.image }} style={styles.cardImage} />
        <View style={styles.cardBody}>
            <View>
                <Text style={styles.cardTitle}>{product.name}</Text>
                <Text style={styles.cardPrice}>Rp {product.price.toLocaleString('id-ID')}</Text>
            </View>
            <Text style={styles.cardDescription} numberOfLines={2}>{product.description}</Text>
        </View>
        <View style={styles.cardActions}>
            <TouchableOpacity onPress={onEdit} style={[styles.actionButton, styles.editButton]}>
                <Ionicons name="create-outline" size={18} color="#2563EB" />
                <Text style={[styles.actionButtonText, { color: '#2563EB' }]}>Edit</Text>
            </TouchableOpacity>
            {/* --- PERBAIKAN DI SINI: Menghapus referensi ke styles.deleteButton --- */}
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Hapus</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default function AgentProducts() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!user || (user.userType !== 'agent' && user.userType !== 'admin')) {
      router.replace('/');
      return;
    }
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        config.databaseId!,
        config.rotiCollectionId!,
        [Query.equal('agentId', user.$id), Query.orderDesc('$createdAt')]
      );
      
      const mappedProducts: Product[] = response.documents.map(doc => ({
        $id: doc.$id,
        name: doc.name || '',
        price: Number(doc.price) || 0,
        description: doc.description || '',
        image: doc.image,
        type: doc.type || 'Other',
        gallery: doc.gallery || [],
        agentId: doc.agentId || user.$id,
        status: doc.status || 'active'
      }));
      
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Gagal memuat produk.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (product: Product | null) => {
    setSelectedProduct(product);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setSelectedProduct(null);
    loadProducts();
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Yakin ingin menghapus produk "${product.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                config.databaseId!,
                config.rotiCollectionId!,
                product.$id
              );
              Alert.alert('Sukses', 'Produk berhasil dihapus');
              loadProducts();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Gagal menghapus produk');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B69642" />
        <Text style={{ marginTop: 10, fontFamily: 'Rubik-Medium' }}>Memuat Produk...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Kelola Produk',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          onPress={() => handleOpenForm(null)}
          style={styles.addButton}
        >
          <Ionicons name="add-outline" size={22} color="white" />
          <Text style={styles.addButtonText}>Tambah Produk Baru</Text>
        </TouchableOpacity>

        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>Anda belum memiliki produk.</Text>
            <Text style={styles.emptySubtitle}>Ketuk tombol di atas untuk memulai.</Text>
          </View>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.$id}
              product={product}
              onEdit={() => handleOpenForm(product)}
              onDelete={() => handleDeleteProduct(product)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={isFormVisible}
        animationType="slide"
        onRequestClose={handleCloseForm}
      >
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</Text>
                <TouchableOpacity onPress={handleCloseForm}>
                    <Ionicons name="close-circle" size={28} color="#6B7280" />
                </TouchableOpacity>
            </View>
            <ScrollView>
                <ProductForm
                    mode={selectedProduct ? 'edit' : 'create'}
                    initialData={selectedProduct}
                    onSuccess={handleCloseForm}
                />
            </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    addButton: {
        backgroundColor: '#B69642',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 99,
        marginBottom: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Rubik-Bold',
        marginLeft: 8,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardImage: {
        width: '100%',
        height: 180,
    },
    cardBody: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Rubik-Bold',
        color: '#1F2937',
    },
    cardPrice: {
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: '#B69642',
        marginTop: 4,
    },
    cardDescription: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
        marginTop: 8,
    },
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: '#F3F4F6',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    editButton: {
        borderRightWidth: 1,
        borderColor: '#F3F4F6',
    },
    actionButtonText: {
        fontFamily: 'Rubik-Medium',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Rubik-Bold',
        color: '#374151',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB'
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Rubik-Bold',
        color: '#1F2937',
    }
});
