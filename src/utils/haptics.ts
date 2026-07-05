/**
 * Haptic feedback utilities.
 * Provides light, medium, and success haptic patterns for key interactions.
 */

// @ts-ignore — expo-haptics types resolve through package.json "types" field
import * as Haptics from 'expo-haptics';

/** Light tap — for button presses, toggles */
export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — for confirmations, important actions */
export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Success notification — for completed actions (send, resolve) */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning notification — for errors or destructive confirmations */
export function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
