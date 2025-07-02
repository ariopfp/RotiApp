
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalProvider from "@/lib/global-provider";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../global.css";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    const SPLASH_TIMEOUT = 5000; // 5 seconds maximum wait time
    let timeoutId: ReturnType<typeof setTimeout>;

    const loadApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        
        // Set a maximum timeout for the splash screen
        const id = setTimeout(() => {
          console.log("Splash screen timeout reached, forcing hide");
          SplashScreen.hideAsync()
            .catch(console.error)
            .finally(() => setIsLoading(false));
        }, SPLASH_TIMEOUT);
        
        timeoutId = id;

        // Wait for fonts to load
        if (fontsLoaded) {
          clearTimeout(timeoutId);
          await SplashScreen.hideAsync();
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in splash screen management:", error);
        SplashScreen.hideAsync()
          .catch(console.error)
          .finally(() => setIsLoading(false));
      }
    };

    loadApp().catch((error) => {
      console.error("Failed to load app:", error);
      setIsLoading(false);
    });

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fontsLoaded]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: "#EFDBA7", 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <ActivityIndicator 
          size="large" 
          color="#B69642"
          animating={true} 
        />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GlobalProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }} 
          />
      </GlobalProvider>
    </ErrorBoundary>
  );
}