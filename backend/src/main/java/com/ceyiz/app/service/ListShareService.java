package com.ceyiz.app.service;

import com.ceyiz.app.dto.ListShareResponse;
import com.ceyiz.app.entity.ListShare;
import com.ceyiz.app.entity.ShareRole;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.ListShareRepository;
import com.ceyiz.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ListShareService {

    private final ListShareRepository listShareRepository;
    private final UserRepository userRepository;
    private final ListAccessService listAccessService;

    public ListShareResponse inviteToList(UUID listId, String email, ShareRole role, UUID requesterId) {
        TrousseauList list = listAccessService.requireOwner(listId, requesterId);

        if (role == ShareRole.OWNER) {
            throw new IllegalArgumentException("Sahiplik rolü doğrudan atanamaz");
        }

        User invitedUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Bu e-posta ile kayıtlı kullanıcı bulunamadı"));

        if (invitedUser.getId().equals(list.getOwnerId())) {
            throw new IllegalArgumentException("Liste zaten bu kullanıcıya ait");
        }

        if (listShareRepository.findByListIdAndUserId(listId, invitedUser.getId()).isPresent()) {
            throw new IllegalArgumentException("Bu kullanıcı zaten listeye erişebiliyor");
        }

        ListShare share = new ListShare(listId, invitedUser.getId(), role);
        ListShare saved = listShareRepository.save(share);

        return toResponse(saved, invitedUser);
    }

    public List<ListShareResponse> getShares(UUID listId, UUID requesterId) {
        TrousseauList list = listAccessService.requireAtLeastViewer(listId, requesterId);

        User owner = userRepository.findById(list.getOwnerId())
                .orElseThrow(() -> new IllegalStateException("Liste sahibi kullanıcı bulunamadı"));
        ListShareResponse ownerEntry = new ListShareResponse(null, owner.getId(), owner.getEmail(), owner.getName(), ShareRole.OWNER);

        List<ListShareResponse> memberEntries = listShareRepository.findByListId(listId).stream()
                .map(share -> {
                    User user = userRepository.findById(share.getUserId())
                            .orElseThrow(() -> new IllegalStateException("Paylaşılan kullanıcı bulunamadı"));
                    return toResponse(share, user);
                })
                .toList();

        return Stream.concat(Stream.of(ownerEntry), memberEntries.stream()).toList();
    }

    public void updateRole(UUID listId, UUID shareId, ShareRole newRole, UUID requesterId) {
        listAccessService.requireOwner(listId, requesterId);

        if (newRole == ShareRole.OWNER) {
            throw new IllegalArgumentException("Sahiplik rolü doğrudan atanamaz");
        }

        ListShare share = findShareInList(listId, shareId);
        share.changeRole(newRole);
        listShareRepository.save(share);
    }

    public void removeShare(UUID listId, UUID shareId, UUID requesterId) {
        listAccessService.requireOwner(listId, requesterId);

        ListShare share = findShareInList(listId, shareId);
        listShareRepository.delete(share);
    }

    private ListShare findShareInList(UUID listId, UUID shareId) {
        ListShare share = listShareRepository.findById(shareId)
                .orElseThrow(() -> new IllegalArgumentException("Paylaşım kaydı bulunamadı"));

        if (!share.getListId().equals(listId)) {
            throw new IllegalArgumentException("Paylaşım kaydı bulunamadı");
        }

        return share;
    }

    private ListShareResponse toResponse(ListShare share, User user) {
        return new ListShareResponse(share.getId(), user.getId(), user.getEmail(), user.getName(), share.getRole());
    }

}
