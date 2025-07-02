import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Models, Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const OrderCard = ({
  order,
  onComplete,
}: {
  order: Order;
  onComplete: (id: string) => void;
}) => {
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
          <Text style={[styles.totalValue, { fontSize: 18 }]}>Rp {order.totalAmount.toLocaleString('id-ID')}</Text>
        </View>
        {/* Tombol Selesaikan Pesanan */}
        {order.status === 'shipped' && (
          <TouchableOpacity
            onPress={() => onComplete(order.$id)}
            style={[styles.actionButton, styles.completeButton, { marginTop: 12 }]}
          >
            <Ionicons name="checkmark-done-sharp" size={16} color="white" />
            <Text style={styles.actionButtonText}>Selesaikan Pesanan</Text>
          </TouchableOpacity>
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

export default function PurchaseHistory() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');

  useEffect(() => {
    if (!user) {
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
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('$createdAt')
        ]
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
              } catch (e) { }
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

      setOrders(ordersWithItems);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menyelesaikan pesanan
  const handleCompleteOrder = async (orderId: string) => {
    try {
      await databases.updateDocument(
        config.databaseId!,
        config.ordersCollectionId!,
        orderId,
        { status: 'delivered' }
      );
      Alert.alert('Sukses', 'Pesanan telah diselesaikan.');
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'Gagal menyelesaikan pesanan.');
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [user]);

  // Filter orders by status
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.status === statusFilter);

  // Status filter buttons
  const statusOptions: { label: string, value: 'all' | Order['status'] }[] = [
    { label: 'Semua', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Dikirim', value: 'shipped' },
    { label: 'Selesai', value: 'delivered' },
    { label: 'Ditolak', value: 'rejected' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Riwayat Pembelian',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />
      {/* Filter Status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}
        style={{ maxHeight: 48 }}
      >
        {statusOptions.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setStatusFilter(opt.value)}
            style={{
              backgroundColor: statusFilter === opt.value ? '#B69642' : '#E5E7EB',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 99,
              marginRight: 8,
            }}
          >
            <Text style={{
              color: statusFilter === opt.value ? 'white' : '#374151',
              fontFamily: 'Rubik-Medium',
              fontSize: 14,
            }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* End Filter Status */}

      {loading ? (
        <View style={styles.centeredView}>
          <ActivityIndicator size="large" color="#B69642" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B69642" />
          }
        >
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <OrderCard key={order.$id} order={order} onComplete={handleCompleteOrder} />
            ))
          ) : (
            <EmptyState message="Belum ada riwayat pembelian." />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 99,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: 'white',
    fontFamily: 'Rubik-Bold',
    fontSize: 16,
    marginLeft: 8,
  },
});