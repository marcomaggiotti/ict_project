import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ConfigProvider } from "./src/config";
import { AudioScreen } from "./src/screens/AudioScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { ImageScreen } from "./src/screens/ImageScreen";
import { MasterScreen } from "./src/screens/MasterScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ConfigProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator>
          <Tab.Screen name="Audio" component={AudioScreen} />
          <Tab.Screen name="Calendar" component={CalendarScreen} />
          <Tab.Screen name="Images" component={ImageScreen} />
          <Tab.Screen name="Master" component={MasterScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </ConfigProvider>
  );
}
