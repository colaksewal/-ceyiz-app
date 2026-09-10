package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CategoryTemplateResponse;
import com.ceyiz.app.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/templates")
public class TemplatePreviewController {

    private final TemplateService templateService;

    @GetMapping
    public ResponseEntity<List<CategoryTemplateResponse>> getAllTemplates(){
        return ResponseEntity.ok(templateService.getAllTemplates());
    }
}
