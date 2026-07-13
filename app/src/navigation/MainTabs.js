import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { border, colors } from "../theme";
import MiaScreen from "../screens/MiaScreen";
import SimulateScreen from "../screens/SimulateScreen";
import TwinHomeScreen from "../screens/TwinHomeScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: { on: "■", off: "□" }, // filled / hollow square
  MIA: { on: "●", off: "○" }, // filled / hollow circle (avatar)
  Simulate: { on: "▲", off: "△" }, // filled / hollow triangle
};

function TabIcon({ route, focused }) {
  const glyphs = ICONS[route.name] || ICONS.Home;
  return (
    <Text style={{ fontSize: 18, color: focused ? colors.maroon : colors.muted }}>
      {focused ? glyphs.on : glyphs.off}
    </Text>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.maroon,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: border.thick,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused }) => <TabIcon route={route} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={TwinHomeScreen} options={{ title: "My Twin" }} />
      <Tab.Screen name="MIA" component={MiaScreen} options={{ title: "MIA" }} />
      <Tab.Screen name="Simulate" component={SimulateScreen} options={{ title: "Simulate" }} />
    </Tab.Navigator>
  );
}
