///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import ScreenTabView from '../../components/ScreenTabView';
import Data from './Data';
import Recipes from './Recipes';
import { SceneMap } from 'react-native-tab-view';


///////////////////////////////// SIGNATURE /////////////////////////////////

const FoodScreen = () => {
  const route = useRoute();


  ///////////////////////////////// FUNCTIONS /////////////////////////////////

  // indices and routes
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'recipes', title: 'Recipes' },
    { key: 'data', title: 'Data' },
  ]);
  
  // sync tab index with React Navigation params when focused
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.screen === 'Recipes') {
        setIndex(0);
      } else if (route.params?.screen === 'Data') {
        setIndex(1);
      }
    }, [route.params])
  );

  // render scenes with passing whether the tab is selected as a prop
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'recipes':
        return <Recipes isSelectedTab={index === 0} />;
      case 'data':
        return <Data isSelectedTab={index === 1} />;
      default:
        return null;
    }
  };


  ///////////////////////////////// HTML /////////////////////////////////

  return (
    <ScreenTabView
      index={index}
      routes={routes}
      renderScene={renderScene}
      onIndexChange={setIndex}
    />
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default FoodScreen;