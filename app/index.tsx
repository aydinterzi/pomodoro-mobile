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
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define a type for timer types
type TimerTypeKey = "POMODORO" | "SHORT_BREAK" | "LONG_BREAK";

// Timer types with their respective durations (in seconds)
const INITIAL_TIMER_TYPES: Record<TimerTypeKey, number> = {
  POMODORO: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
};

export default function PomodoroScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // State variables
  const [timerType, setTimerType] = useState<TimerTypeKey>("POMODORO");
  const [timerDurations, setTimerDurations] = useState(INITIAL_TIMER_TYPES);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER_TYPES.POMODORO);
  const [isActive, setIsActive] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  // Temporary state for settings dialog - stores minutes as strings
  const [tempTimerDurations, setTempTimerDurations] = useState<
    Record<TimerTypeKey, string>
  >({
    POMODORO: (INITIAL_TIMER_TYPES.POMODORO / 60).toString(),
    SHORT_BREAK: (INITIAL_TIMER_TYPES.SHORT_BREAK / 60).toString(),
    LONG_BREAK: (INITIAL_TIMER_TYPES.LONG_BREAK / 60).toString(),
  });

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
    let interval: ReturnType<typeof setInterval> | null = null;

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
          setTimeLeft(timerDurations.LONG_BREAK);
        } else {
          setTimerType("SHORT_BREAK");
          setTimeLeft(timerDurations.SHORT_BREAK);
        }
      } else {
        // After a break, return to pomodoro
        setTimerType("POMODORO");
        setTimeLeft(timerDurations.POMODORO);
      }

      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, timerType, pomodoroCount, isMuted, timerDurations]);

  // Effect to initialize tempTimerDurations (as strings) when settings dialog opens
  const prevSettingsVisible = useRef(settingsVisible);
  useEffect(() => {
    if (settingsVisible && !prevSettingsVisible.current) {
      // Dialog just opened
      setTempTimerDurations({
        POMODORO: (timerDurations.POMODORO / 60).toString(),
        SHORT_BREAK: (timerDurations.SHORT_BREAK / 60).toString(),
        LONG_BREAK: (timerDurations.LONG_BREAK / 60).toString(),
      });
    }
    prevSettingsVisible.current = settingsVisible;
  }, [settingsVisible, timerDurations]);

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
    const totalTime = timerDurations[timerType];
    if (totalTime === 0) {
      return 0; // Prevent division by zero if totalTime is 0
    }
    return (totalTime - timeLeft) / totalTime;
  };

  // Toggle timer (start/pause)
  const toggleTimer = (): void => {
    setIsActive(!isActive);
  };

  // Reset timer
  const resetTimer = (): void => {
    setIsActive(false);
    setTimeLeft(timerDurations[timerType]);
  };

  // Switch timer types
  const switchTimerType = (type: TimerTypeKey): void => {
    setIsActive(false);
    setTimerType(type);
    setTimeLeft(timerDurations[type]);
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

  // Handle duration change
  const handleDurationChange = (
    type: TimerTypeKey,
    durationInSeconds: number
  ): void => {
    setTimerDurations((prevDurations) => ({
      ...prevDurations,
      [type]: durationInSeconds,
    }));

    // If the currently selected timer type's duration is changed and the timer is not active,
    // update timeLeft to the new duration.
    if (timerType === type && !isActive) {
      setTimeLeft(durationInSeconds);
    }
  };

  // Handle temporary duration changes (string input) in settings
  const handleTempDurationChange = (type: TimerTypeKey, text: string) => {
    setTempTimerDurations((prev) => ({
      ...prev,
      [type]: text, // Store the raw text
    }));
  };

  // Save settings and close dialog
  const handleSaveSettings = () => {
    const newDurationsInSeconds: Record<TimerTypeKey, number> = {
      ...INITIAL_TIMER_TYPES,
    }; // Start with defaults

    for (const typeKey in tempTimerDurations) {
      const type = typeKey as TimerTypeKey;
      const minutesString = tempTimerDurations[type];
      const parsedMinutes = parseInt(minutesString, 10);

      if (!Number.isNaN(parsedMinutes) && parsedMinutes >= 0) {
        newDurationsInSeconds[type] = parsedMinutes * 60;
      } else {
        // If parsing fails or is negative, it keeps the default from INITIAL_TIMER_TYPES
        // which was already set when newDurationsInSeconds was initialized.
        // Or, more explicitly to show intent:
        newDurationsInSeconds[type] = INITIAL_TIMER_TYPES[type];
      }
    }

    setTimerDurations(newDurationsInSeconds);

    if (!isActive) {
      setTimeLeft(newDurationsInSeconds[timerType]);
    }
    setSettingsVisible(false);
  };

  // Cancel settings changes and close dialog
  const handleCancelSettings = () => {
    setSettingsVisible(false); // Simply close, temp changes are discarded implicitly
    // as tempTimerDurations will be reset on next open
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
          onDismiss={handleCancelSettings} // Dismiss acts as Cancel
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
            <View style={styles.settingRow}>
              <Text>Pomodoro (minutes)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={tempTimerDurations.POMODORO}
                onChangeText={(text) =>
                  handleTempDurationChange("POMODORO", text)
                }
              />
            </View>
            <View style={styles.settingRow}>
              <Text>Short Break (minutes)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={tempTimerDurations.SHORT_BREAK}
                onChangeText={(text) =>
                  handleTempDurationChange("SHORT_BREAK", text)
                }
              />
            </View>
            <View style={styles.settingRow}>
              <Text>Long Break (minutes)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={tempTimerDurations.LONG_BREAK}
                onChangeText={(text) =>
                  handleTempDurationChange("LONG_BREAK", text)
                }
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelSettings}>Cancel</Button>
            <Button onPress={handleSaveSettings}>Save</Button>
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
  input: {
    height: 40,
    width: 60,
    textAlign: "center",
    marginLeft: 10,
  },
});
