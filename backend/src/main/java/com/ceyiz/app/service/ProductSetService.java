package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
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
    private final ListAccessService listAccessService;

    @Transactional
    public ProductSet createSet(UUID listId, CreateProductSetRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);

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
        listAccessService.requireAtLeastViewer(listId, requesterId);

        return productSetRepository.findByListId(listId);
    }
}
