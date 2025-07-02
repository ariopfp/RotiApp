import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductForm } from '@/constants/agent/ProductForm';
import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Product } from '@/types/product';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.userType !== 'agent' && user.userType !== 'admin')) {
      router.replace('/');
      return;
    }
    loadProduct();
  }, [user, id]);

  const loadProduct = async () => {
    const productId = Array.isArray(id) ? id[0] : id;
    if (!productId) {
        setLoading(false);
        return;
    };
    
    try {
      setLoading(true);
      const doc = await databases.getDocument(
        config.databaseId!,
        config.rotiCollectionId!,
        productId
      );

      const fetchedProduct: Product = {
        $id: doc.$id,
        name: doc.name || '',
        price: Number(doc.price) || 0,
        description: doc.description || '',
        image: doc.image,
        gallery: doc.gallery || [],
        agentId: doc.agentId || user!.$id,
        status: doc.status || 'active'
      };
      
      setProduct(fetchedProduct);
    } catch (error) {
      console.error('Error loading product:', error);
      // Optionally, show an alert before navigating back
      // Alert.alert("Error", "Gagal memuat detail produk.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B69642" />
        <Text style={styles.loadingText}>Memuat Detail Produk...</Text>
      </View>
    );
  }

  if (!product) {
    return (
        <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Gagal memuat produk. Silakan coba lagi.</Text>
        </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Edit Produk',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Formulir produk sekarang memiliki padding dan berada di dalam ScrollView */}
        <ProductForm
          mode="edit"
          initialData={product}
          onSuccess={() => {
            router.back();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContainer: {
        padding: 16, // Memberi padding di sekitar form
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    loadingText: {
        marginTop: 10,
        fontFamily: 'Rubik-Medium',
        fontSize: 16,
        color: '#6B7280',
    },
    errorText: {
        fontFamily: 'Rubik-Medium',
        fontSize: 16,
        color: '#EF4444',
    }
});