import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AnimatedScreen from '../components/AnimatedScreen';

const Stack = createNativeStackNavigator();

const withScreenAnimation = (ScreenComponent) => {
  const Wrapped = (props) => (
    <AnimatedScreen>
      <ScreenComponent {...props} />
    </AnimatedScreen>
  );
  return Wrapped;
};

const AnimatedLoginScreen = withScreenAnimation(LoginScreen);
const AnimatedRegisterScreen = withScreenAnimation(RegisterScreen);

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={AnimatedLoginScreen} />
      <Stack.Screen name="Register" component={AnimatedRegisterScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
