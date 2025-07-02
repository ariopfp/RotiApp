import { Ionicons } from '@expo/vector-icons';
import { Href, Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Query } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { config, databases } from '@/lib/appwrite';
import { useGlobalContext } from '../../../lib/global-provider';

// Tipe data untuk statistik
interface SalesStats {
  totalSales: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalProducts: number;
  topProducts: Array<{
    name: string;
    totalSold: number;
    revenue: number;
  }>;
}

// Komponen Kartu Statistik
const StatCard = ({ icon, value, label, color }: { icon: any, value: string | number, label: string, color: string }) => (
    <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}1A` }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// Komponen untuk Bar Chart sederhana
const BarChart = ({ data }: { data: SalesStats['topProducts'] }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(p => p.totalSold), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((product, index) => (
        <View key={index} style={styles.barWrapper}>
          <Text style={styles.barLabel} numberOfLines={2}>{product.name}</Text>
          <View style={styles.barBackground}>
            <View style={[styles.bar, { width: `${(product.totalSold / maxValue) * 100}%` }]} />
          </View>
          <Text style={styles.barValue}>{product.totalSold} terjual (Rp {product.revenue.toLocaleString('id-ID')})</Text>
        </View>
      ))}
    </View>
  );
};

// Komponen Tombol Menu
const MenuButton = ({ title, description, route, icon, onPress }: { title: string, description: string, route: Href<any>, icon: any, onPress: (route: Href<any>) => void }) => (
    <TouchableOpacity onPress={() => onPress(route)} style={styles.menuButton}>
        <View style={styles.menuIconContainer}>
            <Ionicons name={icon} size={28} color="#B69642" />
        </View>
        <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>{title}</Text>
            <Text style={styles.menuDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={24} color="#CBD5E0" />
    </TouchableOpacity>
);

export default function AgentDashboard() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user || (user.userType !== 'agent' && user.userType !== 'admin')) {
      router.replace('/');
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Ambil produk milik agen
      const productsResponse = await databases.listDocuments(
        config.databaseId!,
        config.rotiCollectionId!,
        [
          Query.equal('agentId', user.$id),
          Query.limit(5000)
        ]
      );
      const agentProducts = productsResponse.documents;
      const agentProductIds = new Set(agentProducts.map((p: any) => p.$id));
      const totalProducts = agentProducts.length;

      if (agentProductIds.size === 0) {
        setStats({ totalSales: 0, totalOrders: 0, completedOrders: 0, pendingOrders: 0, totalProducts, topProducts: [] });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Ambil semua item pesanan yang terkait dengan produk agen
      const orderItemsResponse = await databases.listDocuments(
        config.databaseId!,
        config.orderItemsCollectionId!,
        [
          Query.limit(5000),
          Query.equal('productId', Array.from(agentProductIds))
        ]
      );
      const agentOrderItems = orderItemsResponse.documents;

      const relevantOrderIds = [...new Set(agentOrderItems.map((item: any) => item.orderId))];
      if (relevantOrderIds.length === 0) {
        setStats({ totalSales: 0, totalOrders: 0, completedOrders: 0, pendingOrders: 0, totalProducts, topProducts: [] });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Ambil semua order yang terkait dengan order item di atas
      const ordersResponse = await databases.listDocuments(
        config.databaseId!,
        config.ordersCollectionId!,
        [
          Query.limit(5000),
          Query.equal('$id', relevantOrderIds)
        ]
      );
      const agentOrders = ordersResponse.documents;

      const salesByProduct: Record<string, { totalSold: number; revenue: number; name: string }> = {};
      let totalSales = 0;

      agentOrders.forEach((order: any) => {
        if (order.status === 'delivered') {
          const itemsInOrder = agentOrderItems.filter((item: any) => item.orderId === order.$id);
          itemsInOrder.forEach((item: any) => {
            const price = item.priceAtPurchase * item.quantity;
            totalSales += price;

            if (!salesByProduct[item.productId]) {
              const product = agentProducts.find((p: any) => p.$id === item.productId);
              salesByProduct[item.productId] = { totalSold: 0, revenue: 0, name: product?.name || 'Produk Dihapus' };
            }
            salesByProduct[item.productId].totalSold += item.quantity;
            salesByProduct[item.productId].revenue += price;
          });
        }
      });

      const topProducts = Object.values(salesByProduct).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);

      setStats({
        totalSales,
        totalOrders: agentOrders.length,
        completedOrders: agentOrders.filter((o: any) => o.status === 'delivered').length,
        pendingOrders: agentOrders.filter((o: any) => o.status === 'pending').length,
        totalProducts,
        topProducts
      });

    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert("Error", "Gagal memuat statistik penjualan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [user]);

  const menuItems = [
    { title: 'Produk', description: 'Tambah, edit, dan kelola produk Anda', route: '/(root)/(agent)/products' as const, icon: 'cube-outline' },
    { title: 'Pesanan', description: 'Lihat dan proses pesanan masuk', route: '/(root)/(agent)/orders' as const, icon: 'receipt-outline' },
    { title: 'Pengaturan Toko', description: 'Atur profil dan informasi toko', route: '/(root)/(agent)/settings' as const, icon: 'settings-outline' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Dashboard Agen',
          headerTitleStyle: { fontFamily: 'Rubik-Bold' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F8F9FA' },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Selamat datang, {user?.name}!</Text>
          <Text style={styles.headerSubtitle}>Kelola toko Anda dengan mudah dari sini.</Text>
        </View>

        {/* Bagian Statistik */}
        <View style={styles.statsContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#B69642" />
          ) : (
            <>
              <StatCard icon="file-tray-stacked-outline" value={stats?.totalProducts ?? 0} label="Total Produk" color="#3B82F6" />
              <StatCard icon="time-outline" value={stats?.pendingOrders ?? 0} label="Pesanan Pending" color="#F59E0B" />
              <StatCard icon="cash-outline" value={`Rp ${(stats?.totalSales ?? 0).toLocaleString('id-ID')}`} label="Total Penjualan" color="#10B981" />
              <StatCard icon="receipt-outline" value={stats?.totalOrders ?? 0} label="Total Pesanan" color="#8B5CF6" />
            </>
          )}
        </View>

        {/* Produk Terlaris */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produk Terlaris</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#B69642" />
          ) : stats && stats.topProducts.length > 0 ? (
            <View style={styles.card}>
              <BarChart data={stats.topProducts} />
            </View>
          ) : (
            <View style={[styles.card, styles.emptyChart]}>
              <Ionicons name="stats-chart-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Belum ada penjualan yang tercatat.</Text>
            </View>
          )}
        </View>

        {/* Bagian Menu */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <MenuButton key={item.route} {...item} onPress={(route) => router.push(route)} />
          ))}
        </View>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    minWidth: 120,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  chartContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  barWrapper: {
    marginBottom: 8,
  },
  barLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  barBackground: {
    backgroundColor: '#E5E7EB',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 2,
  },
  bar: {
    backgroundColor: '#B69642',
    height: 16,
    borderRadius: 8,
  },
  barValue: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 8,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
  },
  emptyChartText: {
    fontFamily: 'Rubik-Regular',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuIconContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    padding: 12,
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: '#1F2937',
  },
  menuDescription: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
});