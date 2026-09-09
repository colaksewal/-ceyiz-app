package com.ceyiz.app.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListSuggestionResponse(List<CategorySuggestion> categories, String rationale) {
}