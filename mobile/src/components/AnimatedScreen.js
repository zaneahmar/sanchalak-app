import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const AnimatedScreen = ({ children, style, animateOnFocus = true }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(16)).current;
  const hasAnimatedRef = useRef(false);

  const runAnimation = useCallback(() => {
    opacity.setValue(0);
    translateX.setValue(16);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateX]);

  useFocusEffect(
    useCallback(() => {
      if (!animateOnFocus) {
        return;
      }
      if (hasAnimatedRef.current) {
        return;
      }
      runAnimation();
      hasAnimatedRef.current = true;
    }, [animateOnFocus, runAnimation])
  );

  useEffect(() => {
    if (animateOnFocus) {
      return;
    }
    runAnimation();
    hasAnimatedRef.current = true;
  }, [animateOnFocus, runAnimation]);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateX }] }, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedScreen;
