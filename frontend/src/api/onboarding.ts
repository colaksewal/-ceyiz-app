import api from "../lib/api";
import type { OnboardingStatus } from "../types";

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await api.get<OnboardingStatus>("/onboarding");
  return response.data;
}
