///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';
import ScreenTabView from '../../components/ScreenTabView';
import ShoppingList from './ShoppingList';
import RecipeSpotlight from './RecipeSpotlight';
import { SceneMap } from 'react-native-tab-view';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ShoppingScreen = () => {


  ///////////////////////////////// FUNCTIONS /////////////////////////////////

  // indices and routes
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'list', title: 'Shopping List' },
    { key: 'spotlight', title: 'Recipe Spotlight' },
  ]);

  // render scenes with passing whether the tab is selected as a prop
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'list':
        return <ShoppingList isSelectedTab={index === 0} />;
      case 'spotlight':
        return <RecipeSpotlight isSelectedTab={index === 1} />;
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

export default ShoppingScreen;