import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useApp } from "../context/AppContext";
import RecommendationDetailScreen from "../screens/RecommendationDetailScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import { colors } from "../theme";
import MainTabs from "./MainTabs";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isOnboarded, hydrated } = useApp();

  if (!hydrated) return null; // AppProvider hasn't finished reading AsyncStorage yet

  return (
    <Stack.Navigator
      initialRouteName={isOnboarded ? "Main" : "Onboarding"}
      screenOptions={{
        headerStyle: { backgroundColor: colors.maroon },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "900", letterSpacing: 0.3 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="RecommendationDetail"
        component={RecommendationDetailScreen}
        options={{ title: "Why this recommendation?" }}
      />
    </Stack.Navigator>
  );
}
