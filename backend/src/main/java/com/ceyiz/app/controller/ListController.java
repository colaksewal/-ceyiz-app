package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CreateListRequest;
import com.ceyiz.app.dto.ListResponse;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.service.ListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lists")
public class ListController {

    private final ListService listService;


    @PostMapping
    public ResponseEntity<ListResponse> createList( @RequestBody  CreateListRequest request, Authentication authentication){

        UUID ownerId = UUID.fromString(authentication.getName());
        TrousseauList created = listService.createList(request, ownerId);
        return ResponseEntity.ok(ListResponse.from(created));
    }

    @GetMapping
    public ResponseEntity<List<ListResponse>> getMyLists(Authentication authentication){
        UUID ownerId = UUID.fromString(authentication.getName());
        List<ListResponse> lists = listService.getMyLists(ownerId).stream().map(ListResponse::from).toList();

        return ResponseEntity.ok(lists);
    }



}
