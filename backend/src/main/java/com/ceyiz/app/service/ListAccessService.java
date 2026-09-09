package com.ceyiz.app.service;

import com.ceyiz.app.entity.ShareRole;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.repository.ListRepository;
import com.ceyiz.app.repository.ListShareRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * "Bu kullanıcı bu listeye ne yapabilir" mantığının tek toplandığı yer. Liste sahibi
 * (owner) her zaman tam yetkilidir; EDITOR/VIEWER rolleri list_shares tablosundan okunur.
 * Diğer servisler (CategoryService, ProductService vb.) kendi list.getOwnerId() eşitlik
 * kontrollerini bunun yerine kullanır.
 */
@Service
@RequiredArgsConstructor
public class ListAccessService {

    private final ListRepository listRepository;
    private final ListShareRepository listShareRepository;

    public TrousseauList requireAtLeastViewer(UUID listId, UUID requesterId) {
        TrousseauList list = findList(listId);
        if (!hasAtLeast(list, requesterId, ShareRole.VIEWER)) {
            throw new SecurityException("Bu listeyi görüntüleme yetkiniz yok");
        }
        return list;
    }

    public TrousseauList requireAtLeastEditor(UUID listId, UUID requesterId) {
        TrousseauList list = findList(listId);
        if (!hasAtLeast(list, requesterId, ShareRole.EDITOR)) {
            throw new SecurityException("Bu liste üzerinde düzenleme yetkiniz yok");
        }
        return list;
    }

    public TrousseauList requireOwner(UUID listId, UUID requesterId) {
        TrousseauList list = findList(listId);
        if (!list.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Bu işlem için liste sahibi olmanız gerekiyor");
        }
        return list;
    }

    private TrousseauList findList(UUID listId) {
        return listRepository.findById(listId)
                .orElseThrow(() -> new IllegalArgumentException("Liste bulunamadı"));
    }

    private boolean hasAtLeast(TrousseauList list, UUID requesterId, ShareRole minimumRole) {
        if (list.getOwnerId().equals(requesterId)) {
            return true;
        }
        return listShareRepository.findByListIdAndUserId(list.getId(), requesterId)
                .map(share -> roleRank(share.getRole()) >= roleRank(minimumRole))
                .orElse(false);
    }

    private int roleRank(ShareRole role) {
        return switch (role) {
            case VIEWER -> 1;
            case EDITOR -> 2;
            case OWNER -> 3;
        };
    }

}
