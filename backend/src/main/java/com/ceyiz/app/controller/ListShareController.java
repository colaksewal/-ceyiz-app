package com.ceyiz.app.controller;

import com.ceyiz.app.dto.ListShareResponse;
import com.ceyiz.app.dto.ShareListRequest;
import com.ceyiz.app.dto.UpdateShareRoleRequest;
import com.ceyiz.app.service.ListShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lists/{listId}/shares")
public class ListShareController {

    private final ListShareService listShareService;

    @PostMapping
    public ResponseEntity<ListShareResponse> invite(
            @PathVariable UUID listId,
            @RequestBody ShareListRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        ListShareResponse created = listShareService.inviteToList(listId, request.email(), request.role(), requesterId);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<ListShareResponse>> getShares(
            @PathVariable UUID listId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(listShareService.getShares(listId, requesterId));
    }

    @PatchMapping("/{shareId}")
    public ResponseEntity<Void> updateRole(
            @PathVariable UUID listId,
            @PathVariable UUID shareId,
            @RequestBody UpdateShareRoleRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        listShareService.updateRole(listId, shareId, request.role(), requesterId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{shareId}")
    public ResponseEntity<Void> removeShare(
            @PathVariable UUID listId,
            @PathVariable UUID shareId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        listShareService.removeShare(listId, shareId, requesterId);
        return ResponseEntity.noContent().build();
    }

}
