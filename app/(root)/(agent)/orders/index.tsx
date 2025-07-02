import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Models, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context'; // <-- 1. Import SafeAreaView

// Tipe data (tidak berubah)
interface Order {
  $id: string;
  userId: string;
  totalAmount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'rejected';
  shippingAddress: string;
  createdAt: string;
  items?: OrderItem[];
}

interface OrderItem {
  $id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  product?: {
    name: string;
    image?: string;
    agentId: string;
  };
}

// Komponen-komponen UI (OrderCard, OrderItemRow, EmptyState) tetap sama...
const OrderItemRow = ({ item }: { item: OrderItem }) => (
  <View style={styles.itemRow}>
    <Image
      source={{ uri: item.product?.image || 'https://via.placeholder.com/150' }}
      style={styles.itemImage}
    />
    <View style={styles.itemDetails}>
      <Text style={styles.itemName} numberOfLines={2}>
        {item.product?.name || 'Produk tidak ditemukan'}
      </Text>
      <Text style={styles.itemQuantity}>
        {item.quantity}x @ Rp {item.priceAtPurchase.toLocaleString('id-ID')}
      </Text>
    </View>
    <Text style={styles.itemTotal}>
      Rp {(item.quantity * item.priceAtPurchase).toLocaleString('id-ID')}
    </Text>
  </View>
);

const OrderCard = ({ order, onUpdateStatus, onReject }: { order: Order, onUpdateStatus: (id: string, status: Order['status']) => void, onReject: (id: string) => void }) => {
  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', color: '#F59E0B', backgroundColor: '#FFFBEB' };
      case 'shipped':
        return { text: 'Dikirim', color: '#3B82F6', backgroundColor: '#EFF6FF' };
      case 'delivered':
        return { text: 'Selesai', color: '#10B981', backgroundColor: '#F0FDF4' };
      case 'rejected':
        return { text: 'Ditolak', color: '#EF4444', backgroundColor: '#FEF2F2' };
      default:
        return { text: 'Unknown', color: '#6B7280', backgroundColor: '#F3F4F6' };
    }
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{order.$id.slice(-6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>
      </View>
      
      <View style={styles.itemContainer}>
        {order.items?.map((item) => (
          <OrderItemRow key={item.$id} item={item} />
        ))}
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={2}>{order.shippingAddress}</Text>
        </View>
         <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tanggal</Text>
            <Text style={styles.totalValue}>{new Date(order.createdAt).toLocaleDateString('id-ID')}</Text>
          </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, {fontSize: 18}]}>Rp {order.totalAmount.toLocaleString('id-ID')}</Text>
        </View>

        {order.status === 'pending' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => onReject(order.$id)} style={[styles.actionButton, styles.rejectButton]}>
              <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Tolak</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onUpdateStatus(order.$id, 'shipped')} style={[styles.actionButton, styles.acceptButton]}>
                <Ionicons name="checkmark-sharp" size={16} color="white" />
              <Text style={[styles.actionButtonText, styles.acceptButtonText]}>Terima</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const EmptyState = ({ message }: { message: string }) => (
    <View style={styles.emptyContainer}>
        <Ionicons name="file-tray-outline" size={64} color="#CBD5E0" />
        <Text style={styles.emptyText}>{message}</Text>
    </View>
);

// Komponen utama (tidak berubah)
export default function AgentOrders() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Order['status']>('pending');

  useEffect(() => {
    if (!user || (user.userType !== 'agent' && user.userType !== 'admin')) {
      router.replace('/');
      return;
    }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        config.databaseId!,
        config.ordersCollectionId!,
        [Query.orderDesc('$createdAt')]
      );

      const ordersWithItems: Order[] = await Promise.all(
        response.documents.map(async (orderDoc: Models.Document) => {
          const itemsResponse = await databases.listDocuments(
            config.databaseId!,
            config.orderItemsCollectionId!,
            [Query.equal('orderId', orderDoc.$id)]
          );

          const itemsWithProducts = await Promise.all(
            itemsResponse.documents.map(async (item) => {
              let product = null;
              try {
                if (item.productId) {
                    product = await databases.getDocument(
                        config.databaseId!,
                        config.rotiCollectionId!,
                        item.productId
                    );
                }
              } catch (e) { console.warn(`Produk dengan ID ${item.productId} tidak ditemukan.`); }

              return {
                $id: item.$id,
                orderId: item.orderId,
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: item.priceAtPurchase,
                product: product
                  ? { name: product.name, image: product.image, agentId: product.agentId?.$id || product.agentId }
                  : undefined
              };
            })
          );
          
          const newOrder: Order = {
            $id: orderDoc.$id,
            userId: orderDoc.userId,
            totalAmount: orderDoc.totalAmount,
            status: orderDoc.status,
            shippingAddress: orderDoc.shippingAddress,
            createdAt: orderDoc.$createdAt,
            items: itemsWithProducts
          };
          return newOrder;
        })
      );

      const agentOrders = ordersWithItems.filter(order =>
        order.items?.some(item =>
          item.product && item.product.agentId === user.$id
        )
      );

      setOrders(agentOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await databases.updateDocument(
        config.databaseId!,
        config.ordersCollectionId!,
        orderId,
        { status: newStatus }
      );
      Alert.alert('Sukses', 'Status pesanan berhasil diperbarui');
      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Gagal memperbarui status pesanan');
    }
  };

  const handleRejectOrder = (orderId: string) => {
    Alert.alert(
      "Tolak Pesanan",
      "Anda yakin ingin menolak pesanan ini? Aksi ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Tolak", style: "destructive", onPress: () => handleUpdateStatus(orderId, 'rejected')}
      ]
    );
  };

  const filteredOrders = useMemo(() => orders.filter(order => order.status === activeTab), [orders, activeTab]);

  return (
    // 2. Mengganti View dengan SafeAreaView
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Kelola Pesanan',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />
      
      {/* Tab Navigator */}
      <View style={styles.tabContainer}>
        {(['pending', 'shipped', 'delivered', 'rejected'] as Order['status'][]).map(tab => (
            <TouchableOpacity 
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === 'shipped' ? 'Dikirim' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
            </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centeredView}>
          <ActivityIndicator size="large" color="#B69642" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <OrderCard key={order.$id} order={order} onUpdateStatus={handleUpdateStatus} onReject={handleRejectOrder}/>
            ))
          ) : (
            <EmptyState message={`Tidak ada pesanan dengan status "${activeTab}"`} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Stylesheet (tidak berubah)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 99,
    },
    activeTab: {
        backgroundColor: '#B69642',
    },
    tabText: {
        fontFamily: 'Rubik-Medium',
        fontSize: 14,
        color: '#374151',
    },
    activeTabText: {
        color: 'white',
    },
    scrollContainer: { 
        paddingHorizontal: 16, 
        paddingTop: 16,
        paddingBottom: 100 
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
    },
    orderId: { fontFamily: 'Rubik-Bold', fontSize: 16, color: '#1F2937' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    statusText: { fontFamily: 'Rubik-Medium', fontSize: 12, textTransform: 'capitalize' },
    itemContainer: { padding: 16, gap: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F3F4F6' },
    itemDetails: { flex: 1 },
    itemName: { fontFamily: 'Rubik-Medium', color: '#1F2937' },
    itemQuantity: { fontFamily: 'Rubik-Regular', color: '#6B7280', fontSize: 12, marginTop: 2 },
    itemTotal: { fontFamily: 'Rubik-Bold', color: '#374151' },
    cardFooter: { borderTopWidth: 1, borderColor: '#F3F4F6', padding: 16, paddingTop: 12, gap: 8 },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 8,
    },
    addressText: {
        flex: 1,
        fontFamily: 'Rubik-Regular',
        fontSize: 12,
        color: '#6B7280',
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontFamily: 'Rubik-Regular', color: '#6B7280' },
    totalValue: { fontFamily: 'Rubik-Bold', color: '#1F2937', fontSize: 14 },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 8 },
    actionButtonText: { fontFamily: 'Rubik-Bold', fontSize: 14, color: 'white' },
    acceptButton: { backgroundColor: '#10B981' },
    acceptButtonText: { color: 'white' },
    rejectButton: { backgroundColor: '#FEF2F2' },
    rejectButtonText: { color: '#DC2626' },
    completeButton: { backgroundColor: '#3B82F6', marginTop: 12 },
    emptyContainer: {
        marginTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyText: {
        fontFamily: 'Rubik-Medium',
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    }
});