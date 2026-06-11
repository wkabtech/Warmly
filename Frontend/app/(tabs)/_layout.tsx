import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { DashboardIcon, RoomsIcon, ScheduleIcon, ConsumptionIcon } from '../../components/NavbarIcons';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

function AnimatedIcon({ isFocused, children }: { isFocused: boolean; children: React.ReactNode }) {
  const iconScale = useSharedValue(isFocused ? 1.3 : 1);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(iconScale.value, {
            damping: 5,
            stiffness: 80,
            mass: 0.6,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
          }),
        },
      ],
    };
  });

  if (isFocused) {
    iconScale.value = withSpring(1.3, {
      damping: 5,
      stiffness: 80,
      mass: 0.6,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  } else {
    iconScale.value = withTiming(1);
  }

  return (
    <Animated.View style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* ICON uniquement */}
      <Animated.View style={iconStyle}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function AnimatedTabButton({ children, onPress, accessibilityState, style }: any) {
  const isFocused = accessibilityState.selected;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        style,
        {
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 1,
          backgroundColor: 'transparent',
        }
      ]}
      android_ripple={{ color: 'transparent' }}
    >
      <AnimatedIcon isFocused={isFocused}>
        {children}
      </AnimatedIcon>
    </Pressable>
  );
}

export default function TabLayout() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
        tabBarStyle: {
          backgroundColor: isDark ? '#03082F' : '#ffffff',
          borderTopWidth: 0,
          height: 60,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarActiveTintColor: isDark ? '#ffffff' : '#03082F',
        tabBarInactiveTintColor: isDark ? '#ffffff' : '#03082F',
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ size }) => (
            <DashboardIcon size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ size }) => (
            <RoomsIcon size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ size }) => (
            <ScheduleIcon size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="consumption"
        options={{
          tabBarIcon: ({ size }) => (
            <ConsumptionIcon size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
