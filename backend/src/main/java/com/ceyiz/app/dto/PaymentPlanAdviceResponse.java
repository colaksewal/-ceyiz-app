package com.ceyiz.app.dto;

import java.util.List;

/** AI'nın ödeme planı hakkındaki yorumu: kısa genel değerlendirme ve maddeler halinde öneriler. */
public record PaymentPlanAdviceResponse(String summary, List<String> tips) {}
