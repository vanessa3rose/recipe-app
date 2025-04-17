import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import ShoppingScreen from './screens/Shopping/ShoppingScreen';
import PrepScreen from './screens/Prep/PrepScreen';
import PlanningScreen from './screens/Planning/PlanningScreen';
import FoodScreen from './screens/Food/FoodScreen';

const colors = require('./assets/colors');
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.theme700,
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: { backgroundColor: 'white' },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tab.Screen
          name="SHOPPING"
          component={ShoppingScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="cart" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="PREP"
          component={PrepScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="restaurant" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="PLANNING"
          component={PlanningScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="calendar" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="FOOD"
          component={FoodScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="fast-food" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}