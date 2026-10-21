import api from "../lib/api";
import type { ListSummary, PaymentPlan } from "../types";
import type { AiJobStarted } from "./aiJobs";

export async function getListSummary(listId: string): Promise<ListSummary> {
  const response = await api.get<ListSummary>(`/lists/${listId}/summary`);
  return response.data;
}

// monthlyBudget verilmezse plan, düğüne kadar her şeyi alacak aylık tutarı önerir.
export async function getPaymentPlan(listId: string, monthlyBudget: number | null): Promise<PaymentPlan> {
  const response = await api.get<PaymentPlan>(`/lists/${listId}/payment-plan`, {
    params: monthlyBudget ? { monthlyBudget } : undefined,
  });
  return response.data;
}

// Arka planda çalışır: sonuç (PaymentPlanAdvice) iş bitince GET /ai/jobs/{jobId}'den gelir.
export async function requestPlanAdvice(listId: string, monthlyBudget: number | null): Promise<AiJobStarted> {
  const response = await api.post<AiJobStarted>(`/lists/${listId}/payment-plan/ai-advice`, null, {
    params: monthlyBudget ? { monthlyBudget } : undefined,
  });
  return response.data;
}
