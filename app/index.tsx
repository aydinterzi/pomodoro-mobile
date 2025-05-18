import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Vibration, View } from "react-native";
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  Portal,
  ProgressBar,
  Surface,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define a type for timer types
type TimerTypeKey = "POMODORO" | "SHORT_BREAK" | "LONG_BREAK";

// Timer types with their respective durations (in seconds)
const TIMER_TYPES: Record<TimerTypeKey, number> = {
  POMODORO: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
};

export default function PomodoroScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State variables
  const [timerType, setTimerType] = useState<TimerTypeKey>("POMODORO");
  const [timeLeft, setTimeLeft] = useState(TIMER_TYPES.POMODORO);
  const [isActive, setIsActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Animation value for breathing effect
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Start the breathing animation
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      breatheAnim.setValue(1);
    }
  }, [isActive]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // When timer ends
      if (!isMuted) Vibration.vibrate([500, 500, 500]);

      if (timerType === "POMODORO") {
        const newCount = pomodoroCount + 1;
        setPomodoroCount(newCount);

        // After 4 pomodoros, take a long break
        if (newCount % 4 === 0) {
          setTimerType("LONG_BREAK");
          setTimeLeft(TIMER_TYPES.LONG_BREAK);
        } else {
          setTimerType("SHORT_BREAK");
          setTimeLeft(TIMER_TYPES.SHORT_BREAK);
        }
      } else {
        // After a break, return to pomodoro
        setTimerType("POMODORO");
        setTimeLeft(TIMER_TYPES.POMODORO);
      }

      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, timerType, pomodoroCount, isMuted]);

  // Convert seconds to MM:SS format
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate progress ratio (for ProgressBar)
  const getProgress = (): number => {
    const totalTime = TIMER_TYPES[timerType];
    return (totalTime - timeLeft) / totalTime;
  };

  // Toggle timer (start/pause)
  const toggleTimer = (): void => {
    setIsActive(!isActive);
  };

  // Reset timer
  const resetTimer = (): void => {
    setIsActive(false);
    setTimeLeft(TIMER_TYPES[timerType]);
  };

  // Switch timer types
  const switchTimerType = (type: TimerTypeKey): void => {
    setIsActive(false);
    setTimerType(type);
    setTimeLeft(TIMER_TYPES[type]);
  };

  // Get the color based on timer type
  const getColor = (): string => {
    switch (timerType) {
      case "POMODORO":
        return theme.colors.primary;
      case "SHORT_BREAK":
        return theme.colors.secondary;
      case "LONG_BREAK":
        return "#00897B"; // Teal
      default:
        return theme.colors.primary;
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Timer Type Selector */}
        <View style={styles.timerTypeContainer}>
          <Button
            mode={timerType === "POMODORO" ? "contained" : "outlined"}
            onPress={() => switchTimerType("POMODORO")}
            style={styles.timerTypeButton}
          >
            Pomodoro
          </Button>
          <Button
            mode={timerType === "SHORT_BREAK" ? "contained" : "outlined"}
            onPress={() => switchTimerType("SHORT_BREAK")}
            style={styles.timerTypeButton}
          >
            Short Break
          </Button>
          <Button
            mode={timerType === "LONG_BREAK" ? "contained" : "outlined"}
            onPress={() => switchTimerType("LONG_BREAK")}
            style={styles.timerTypeButton}
          >
            Long Break
          </Button>
        </View>

        {/* Timer Display */}
        <Animated.View
          style={[
            styles.timerContainer,
            { transform: [{ scale: breatheAnim }] },
          ]}
        >
          <Surface
            style={[styles.timerSurface, { borderColor: getColor() }]}
            elevation={2}
          >
            <Text style={[styles.timerText, { color: getColor() }]}>
              {formatTime(timeLeft)}
            </Text>
          </Surface>
        </Animated.View>

        {/* Progress Bar */}
        <ProgressBar
          progress={getProgress()}
          color={getColor()}
          style={styles.progressBar}
        />

        {/* Timer Controls */}
        <View style={styles.controlsContainer}>
          <FAB
            icon={isActive ? "pause" : "play"}
            label={isActive ? "Pause" : "Start"}
            color="white"
            style={[styles.mainButton, { backgroundColor: getColor() }]}
            onPress={toggleTimer}
          />

          <FAB
            icon="refresh"
            small
            style={styles.resetButton}
            onPress={resetTimer}
          />

          <IconButton
            icon={isMuted ? "volume-off" : "volume-high"}
            size={24}
            onPress={() => setIsMuted(!isMuted)}
          />

          <IconButton
            icon="cog"
            size={24}
            onPress={() => setSettingsVisible(true)}
          />
        </View>

        {/* Pomodoro Count */}
        <Text style={styles.countText}>
          Completed Pomodoros: {pomodoroCount}
        </Text>
      </View>

      {/* Settings Dialog */}
      <Portal>
        <Dialog
          visible={settingsVisible}
          onDismiss={() => setSettingsVisible(false)}
        >
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Content>
            <View style={styles.settingRow}>
              <Text>Sound</Text>
              <Switch
                value={!isMuted}
                onValueChange={() => setIsMuted(!isMuted)}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSettingsVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  timerTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginTop: 20,
  },
  timerTypeButton: {
    marginHorizontal: 4,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  timerSurface: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
  },
  timerText: {
    fontSize: 60,
    fontWeight: "bold",
  },
  progressBar: {
    height: 8,
    marginHorizontal: 24,
    borderRadius: 4,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
  },
  mainButton: {
    marginHorizontal: 16,
  },
  resetButton: {
    marginHorizontal: 8,
  },
  countText: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
});
