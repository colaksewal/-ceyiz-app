package com.ceyiz.app.service;

import com.ceyiz.app.dto.SetComparisonResult;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SetComparisonService {

    private final ProductSetRepository productSetRepository;
    private final SetItemRepository setItemRepository;
    private final PriceEntryRepository priceEntryRepository;

    public SetComparisonResult compare(UUID setId) {
        var set = productSetRepository.findById(setId)
                .orElseThrow(() -> new IllegalArgumentException("Set bulunamadı"));

        List<SetItem> items = setItemRepository.findBySetId(setId);

        BigDecimal individualTotal = BigDecimal.ZERO;
        int missingItems = 0;

        for (SetItem item : items) {
            Optional<BigDecimal> unitPrice = resolveUnitPrice(item);

            if (unitPrice.isPresent()) {
                BigDecimal lineTotal = unitPrice.get().multiply(BigDecimal.valueOf(item.getQuantity()));
                individualTotal = individualTotal.add(lineTotal);
            } else {
                missingItems++;
            }
        }

        BigDecimal savings = individualTotal.subtract(set.getSetPrice());

        return new SetComparisonResult(set.getSetPrice(), individualTotal, savings, missingItems);
    }

    private Optional<BigDecimal> resolveUnitPrice(SetItem item) {
        if (item.getProductId() != null) {
            var preferredEntry = priceEntryRepository.findByProductIdAndIsPreferredTrue(item.getProductId());
            if (preferredEntry.isPresent()) {
                return Optional.ofNullable(preferredEntry.get().getCashPrice());
            }

            return priceEntryRepository.findByProductId(item.getProductId()).stream()
                    .map(pe -> pe.getCashPrice())
                    .filter(price -> price != null)
                    .min(Comparator.naturalOrder());
        }

        return Optional.ofNullable(item.getEstimatedIndividualPrice());
    }
}