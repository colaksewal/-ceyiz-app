package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateListRequest;
import com.ceyiz.app.entity.ShareRole;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.repository.ListRepository;
import com.ceyiz.app.repository.ListShareRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ListService {

    private final ListRepository listRepository;
    private final ListShareRepository listShareRepository;

    public TrousseauList createList(CreateListRequest request, UUID ownerId){
        TrousseauList list = new TrousseauList(ownerId, request.name() ,request.weddingDate());

        return listRepository.save(list);
    }

    public List<ListWithRole> getMyLists(UUID userId){
        Stream<ListWithRole> owned = listRepository.findByOwnerId(userId).stream()
                .map(list -> new ListWithRole(list, ShareRole.OWNER));

        Stream<ListWithRole> shared = listShareRepository.findByUserId(userId).stream()
                .map(share -> new ListWithRole(
                        listRepository.findById(share.getListId())
                                .orElseThrow(() -> new IllegalStateException("Paylaşım kaydı var ama liste bulunamadı")),
                        share.getRole()
                ));

        return Stream.concat(owned, shared).toList();
    }

}
