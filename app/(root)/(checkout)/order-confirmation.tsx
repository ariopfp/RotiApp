import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const OrderConfirmationScreen = () => {
    const { orderId } = useLocalSearchParams<{ orderId?: string }>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={120} color="#8CCD61" />
            </View>
            <Text style={styles.title}>Pesanan Berhasil!</Text>
            <Text style={styles.subtitle}>
                Terima kasih telah berbelanja dengan kami. Pesanan Anda dengan ID:
            </Text>
            <Text style={styles.orderId}>{orderId}</Text>
            <Text style={styles.subtitle}>sedang kami proses.</Text>

            <TouchableOpacity 
                onPress={() => router.replace('/')} 
                style={styles.button}
            >
                <Text style={styles.buttonText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    iconContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Rubik-Bold',
        color: '#191D31',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#666876',
        textAlign: 'center',
        lineHeight: 24,
    },
    orderId: {
        fontSize: 14,
        fontFamily: 'Rubik-Medium',
        color: '#191D31',
        backgroundColor: '#F1F1F1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginVertical: 8,
    },
    button: {
        backgroundColor: '#B69642',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 99,
        marginTop: 40,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Rubik-Bold'
    }
})

export default OrderConfirmationScreen