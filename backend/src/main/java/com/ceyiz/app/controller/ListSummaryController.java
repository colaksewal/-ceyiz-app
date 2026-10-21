package com.ceyiz.app.controller;

import com.ceyiz.app.dto.AiJobStartedResponse;
import com.ceyiz.app.dto.ListSummaryResponse;
import com.ceyiz.app.dto.PaymentPlanResponse;
import com.ceyiz.app.service.ListSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Liste özeti ve ödeme planı. monthlyBudget verilmezse plan, düğüne kadar her şeyi alacak
 * aylık tutarı önerir. AI yorumu arka planda çalışır (GET /api/ai/jobs/{jobId}).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lists/{listId}")
public class ListSummaryController {

    private final ListSummaryService listSummaryService;

    @GetMapping("/summary")
    public ResponseEntity<ListSummaryResponse> summary(@PathVariable UUID listId, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(listSummaryService.summary(listId, userId));
    }

    @GetMapping("/payment-plan")
    public ResponseEntity<PaymentPlanResponse> paymentPlan(
            @PathVariable UUID listId,
            @RequestParam(value = "monthlyBudget", required = false) BigDecimal monthlyBudget,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(listSummaryService.paymentPlan(listId, userId, monthlyBudget));
    }

    @PostMapping("/payment-plan/ai-advice")
    public ResponseEntity<AiJobStartedResponse> paymentPlanAdvice(
            @PathVariable UUID listId,
            @RequestParam(value = "monthlyBudget", required = false) BigDecimal monthlyBudget,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        UUID jobId = listSummaryService.requestPlanAdvice(listId, userId, monthlyBudget);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new AiJobStartedResponse(jobId));
    }
}
