"use client";

import type {
  SerializedBusinessProfile,
  SerializedBusinessSettings,
} from "../types";

import { SettingsForm } from "./settings-form";

interface SettingsClientProps {
  profile: SerializedBusinessProfile;
  settings: SerializedBusinessSettings;
}

export function SettingsClient({
  profile,
  settings,
}: SettingsClientProps) {
  return (
    <SettingsForm
      profile={profile}
      settings={settings}
    />
  );
}