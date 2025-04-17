///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';
import ScreenTabView from '../../components/ScreenTabView';
import CurrentFood from './CurrentFood';
import MealPrep from './MealPrep';
import { SceneMap } from 'react-native-tab-view';


///////////////////////////////// SIGNATURE /////////////////////////////////

const PrepScreen = () => {


  ///////////////////////////////// FUNCTIONS /////////////////////////////////

  // indices and routes
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'current', title: 'Current Food' },
    { key: 'meal', title: 'Meal Prep' },
  ]);

  // render scenes with passing whether the tab is selected as a prop
  const renderScene = SceneMap({
    current: (props) => <CurrentFood {...props} isSelectedTab={index === 0} />,
    meal: (props) => <MealPrep {...props} isSelectedTab={index === 1} />,
  });


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

export default PrepScreen;