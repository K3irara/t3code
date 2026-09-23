import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { AgentActivityProps } from "../../widgets/AgentActivity";
import {
  getAgentLiveActivities,
  startAgentLiveActivity,
} from "../agent-awareness/agentLiveActivity";
import { showAndroidShowcaseAgentActivity } from "../agent-awareness/androidNotifications";
import { showcaseAndroidActivityData } from "./showcaseAgentActivity";

/**
 * Puts the staged agent activity on screen for the capture runner, which then
 * locks the simulator (iOS) or opens the notification shade (Android).
 * Resolves false when the build cannot show it yet, so the caller retries.
 */
export async function stageShowcaseAgentActivity(
  activity: AgentActivityProps,
  now: number,
): Promise<boolean> {
  // The runner answers the iOS prompt and pre-grants Android's, so this only
  // settles the permission the runner's alert delivery depends on.
  const permission = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (!permission.granted) return false;

  if (Platform.OS === "android") {
    return showAndroidShowcaseAgentActivity(showcaseAndroidActivityData(activity, now));
  }
  if (Platform.OS !== "ios") return false;

  // A retried or revisited scene must not stack a second card.
  await Promise.all(getAgentLiveActivities().map((existing) => existing.end("immediate")));
  // ActivityKit only starts activities while the app is foreground, which
  // holds here: the runner locks the device after the scene reports ready.
  return startAgentLiveActivity(activity) !== null;
}
