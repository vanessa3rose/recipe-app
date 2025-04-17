///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';

import { View } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';

// initialize Firebase App
import { getFirestore } from 'firebase/firestore';
import { app } from '../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ScreenTabView = ({ routes, renderScene, onIndexChange, index }) => {


  ///////////////////////////////// HTML /////////////////////////////////

  return (
    <View className="flex-1">

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={onIndexChange}

        // styling
        renderTabBar={(props) => (
          <TabBar
            {...props}
            className="bg-zinc700"
            indicatorStyle={{ backgroundColor: 'black' }}
          />
        )}
      />
    </View>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ScreenTabView;