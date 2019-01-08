import { createBottomTabNavigator } from "react-navigation";
import create from "../../containers/CreateTodo";
import todos from "../../containers/Todos";
// import settings from "../../containers/Settings";

export default createBottomTabNavigator({
  todos,
  create,
  // settings,
});
