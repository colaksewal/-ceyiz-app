package com.ceyiz.app.dto;
import java.math.BigDecimal;
import java.util.List;


public record ListSuggestionRequest(String homeType, BigDecimal budget, List<String> priorities) {
}



