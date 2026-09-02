package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateListRequest;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.repository.ListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListService {

    private final ListRepository listRepository;

    public TrousseauList createList(CreateListRequest request, UUID ownerId){
        TrousseauList list = new TrousseauList(ownerId, request.name() ,request.weddingDate());

        return listRepository.save(list);
    }

    public List<TrousseauList> getMyLists(UUID ownerId){
        return listRepository.findByOwnerId(ownerId);
    }

}
