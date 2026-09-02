package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.ListRepository;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductSetService {

    private final ProductSetRepository productSetRepository;
    private final SetItemRepository setItemRepository;
    private final ListRepository listRepository;

    @Transactional
    public ProductSet createSet(UUID listId, CreateProductSetRequest request, UUID requesterId) {
        var list = listRepository.findById(listId)
                .orElseThrow(() -> new IllegalArgumentException("Liste bulunamadı"));

        if (!list.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Bu listeye set ekleme yetkiniz yok");
        }

        ProductSet set = new ProductSet(listId, request.name(), request.storeName(), request.setPrice());
        ProductSet savedSet = productSetRepository.save(set);

        for (var itemRequest : request.items()) {
            SetItem item = new SetItem(
                    savedSet.getId(),
                    itemRequest.productId(),
                    itemRequest.itemName(),
                    itemRequest.quantity(),
                    itemRequest.estimatedIndividualPrice()
            );
            setItemRepository.save(item);
        }

        return savedSet;
    }

    public List<ProductSet> getSetsForList(UUID listId, UUID requesterId) {
        var list = listRepository.findById(listId)
                .orElseThrow(() -> new IllegalArgumentException("Liste bulunamadı"));

        if (!list.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Bu listeyi görüntüleme yetkiniz yok");
        }

        return productSetRepository.findByListId(listId);
    }
}