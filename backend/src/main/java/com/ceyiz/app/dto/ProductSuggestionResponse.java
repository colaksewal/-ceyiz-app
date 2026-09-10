package com.ceyiz.app.dto;

import java.util.List;

public record ProductSuggestionResponse(String categoryName, List<String> items) {}
