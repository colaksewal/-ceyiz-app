package com.ceyiz.app.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CategorySuggestion(String categoryName, BigDecimal suggestedBudget, List<String> exampleProducts) {
}