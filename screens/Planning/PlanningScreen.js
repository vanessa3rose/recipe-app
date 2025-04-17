///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';
import ScreenTabView from '../../components/ScreenTabView';
import Details from './Details';
import WeeklyPlan from './WeeklyPlan';
import { SceneMap } from 'react-native-tab-view';


///////////////////////////////// SIGNATURE /////////////////////////////////

const PlanningScreen = () => {


  ///////////////////////////////// FUNCTIONS /////////////////////////////////

  // indices and routes
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'details', title: 'Details' },
    { key: 'weekly', title: 'Weekly Plan' },
  ]);

  // render scenes with passing whether the tab is selected as a prop
  const renderScene = SceneMap({
    details: (props) => <Details {...props} isSelectedTab={index === 0} />,
    weekly: (props) => <WeeklyPlan {...props} isSelectedTab={index === 1} />,
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

export default PlanningScreen;