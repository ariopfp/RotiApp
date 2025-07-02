import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ID } from 'react-native-appwrite';
import { config, databases, storage } from '../../lib/appwrite';
import { useGlobalContext } from '../../lib/global-provider';
import { Product } from '../../types/product';

interface ProductFormProps {
  onSuccess: () => void;
  initialData?: Product | null;
  mode?: 'create' | 'edit';
}

export const ProductForm = ({ onSuccess, initialData, mode = 'create' }: ProductFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [mainImage, setMainImage] = useState<string | null>(initialData?.image || null);
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData?.gallery || []);
  const [loading, setLoading] = useState(false);
  
  const { user } = useGlobalContext();

  const handleImagePick = async (
    setImageFunc: React.Dispatch<React.SetStateAction<any>>, 
    options: { multiple: boolean }
  ) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Izin Diperlukan", "Anda perlu memberikan izin untuk mengakses galeri foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: !options.multiple,
      allowsMultipleSelection: options.multiple,
      quality: 1,
    });

    if (!result.canceled) {
      if (options.multiple && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setImageFunc((prevUris: string[]) => [...prevUris, ...newUris]);
      } else if (!options.multiple && result.assets) {
        setImageFunc(result.assets[0].uri);
      }
    }
  };
  
  const getSafeFileExtension = (mimeType: string): string => {
    const map: { [key: string]: string } = {
        'image/jpeg': 'jpg', 'image/pjpeg': 'jpg', 'image/png': 'png',
        'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic',
    };
    return map[mimeType.toLowerCase()] || 'jpg';
  };

  const uploadImage = async (uri: string): Promise<string> => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExtension = getSafeFileExtension(blob.type);
      const fileName = `product_${Date.now()}.${fileExtension}`;
      const file = { name: fileName, type: blob.type, size: blob.size, uri };
      const uploadedFile = await storage.createFile(config.storageBucketId!, ID.unique(), file);
      return storage.getFileView(config.storageBucketId!, uploadedFile.$id).href;
  };

  const handleSubmit = async () => {
    if (!name || !price || !description || !mainImage) {
      Alert.alert('Error', 'Semua kolom yang wajib diisi harus dilengkapi.');
      return;
    }

    setLoading(true);

    try {
      let mainImageUrl = mainImage;
      if (mainImage && !mainImage.startsWith('http')) {
        mainImageUrl = await uploadImage(mainImage);
      }
      
      const uploadedGalleryUrls = await Promise.all(
        galleryImages.filter(uri => uri && !uri.startsWith('http')).map(uri => uploadImage(uri))
      );

      const newGalleryDocIds = await Promise.all(
        uploadedGalleryUrls.map(url => 
            databases.createDocument(config.databaseId!, config.galleriesCollectionId!, ID.unique(), { image: url })
            .then(doc => doc.$id)
        )
      );

      const existingGalleryIds = initialData?.gallery || [];
      const allGalleryIds = [...existingGalleryIds, ...newGalleryDocIds];

      const productData = {
        name, price: parseFloat(price), description, image: mainImageUrl,
        gallery: allGalleryIds, agentId: user?.$id, status: 'active'
      };

      if (mode === 'edit' && initialData?.$id) {
        await databases.updateDocument(config.databaseId!, config.rotiCollectionId!, initialData.$id, productData);
      } else {
        await databases.createDocument(config.databaseId!, config.rotiCollectionId!, ID.unique(), productData);
      }

      Alert.alert('Sukses', `Produk berhasil ${mode === 'edit' ? 'diperbarui' : 'ditambahkan'}`);
      onSuccess();
    } catch (error: any) {
      console.error("Gagal menyimpan produk:", error);
      Alert.alert('Error', error.message || 'Gagal menyimpan produk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      
      {/* --- FORM FIELDS --- */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nama Produk *</Text>
        <TextInput style={styles.input} placeholder="Contoh: Kaos Sasak Modern" value={name} onChangeText={setName} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Harga (Rp) *</Text>
        <TextInput style={styles.input} placeholder="Contoh: 120000" value={price} onChangeText={setPrice} keyboardType="numeric" />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Deskripsi *</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Jelaskan detail produk Anda di sini..." value={description} onChangeText={setDescription} multiline />
      </View>

      {/* --- IMAGE PICKERS --- */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gambar Utama *</Text>
        <TouchableOpacity onPress={() => handleImagePick(setMainImage, { multiple: false })} style={styles.imagePicker}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={40} color="#9CA3AF" />
              <Text style={styles.uploadText}>Ketuk untuk Pilih Gambar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.fieldGroup}>
          <Text style={styles.label}>Galeri Gambar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {galleryImages.map((uri, index) => (
                  <View key={index} style={styles.galleryItem}>
                      <Image source={{ uri }} style={styles.galleryImage} />
                      <TouchableOpacity
                          onPress={() => setGalleryImages(prev => prev.filter((_, i) => i !== index))}
                          style={styles.deleteIcon}
                      >
                         <Ionicons name="close-circle" size={24} color="#DC2626" />
                      </TouchableOpacity>
                  </View>
              ))}
              <TouchableOpacity onPress={() => handleImagePick(setGalleryImages, { multiple: true })} style={[styles.imagePicker, styles.addGalleryButton]}>
                  <Ionicons name="add" size={40} color="#9CA3AF" />
              </TouchableOpacity>
          </ScrollView>
      </View>

      {/* --- SUBMIT BUTTON --- */}
      <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitButton}>
        {loading ? (
            <ActivityIndicator color="white" /> 
        ) : (
            <Text style={styles.submitButtonText}>{mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Produk'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// --- STYLESHEET UNTUK TAMPILAN MODERN ---
const styles = StyleSheet.create({
    formContainer: {
        padding: 16,
    },
    fieldGroup: {
        marginBottom: 20,
    },
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
        height: 120,
        textAlignVertical: 'top',
    },
    imagePicker: {
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderRadius: 12,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    galleryItem: {
        width: 100,
        height: 100,
        marginRight: 12,
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    deleteIcon: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    addGalleryButton: {
        width: 100,
        height: 100,
    },
    submitButton: {
        backgroundColor: '#B69642',
        paddingVertical: 16,
        borderRadius: 99,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Rubik-Bold',
    },
});