import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { colors } from "@/theme/colors";
import { useUnresolvedCount } from "@/features/inbox/hooks/useUnresolvedCount";

/**
 * Tab navigation layout for authenticated users.
 *
 * Three tabs: Home (Dashboard), Inbox, Settings.
 * - Active tab: Rocket Orange (#FF6B35)
 * - Inactive tab: Light Gray (#E5E7EB)
 * - Tab bar background: white
 * - Labels visible below icons
 * - Inbox tab displays a numeric badge with unresolved feedback count
 *
 * Expo Router's Tabs component preserves each tab's scroll position
 * and nested screen stack by default (unmountOnBlur defaults to false).
 *
 * Requirements: 9.1, 9.2, 9.4, 9.5
 */
export default function TabLayout() {
  const { data: unresolvedCount } = useUnresolvedCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.rocketOrange,
        tabBarInactiveTintColor: colors.lightGray,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.lightGray,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" size={size} color={color} />
          ),
          tabBarBadge:
            unresolvedCount && unresolvedCount > 0
              ? unresolvedCount
              : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
