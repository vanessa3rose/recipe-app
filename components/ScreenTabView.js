///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React from 'react';
import { View } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';


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