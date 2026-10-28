package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ProductStatus;

import java.util.List;
import java.util.UUID;

/**
 * parts: ürün bir setten geldiyse setin parçaları (adetleriyle), değilse boş. partCount: parça adetleri toplamı.
 */
public record ProductResponse(
        UUID id,
        String name,
        ProductStatus status,
        String url,
        int partCount,
        List<Part> parts
) {

    public record Part(String name, int quantity) {}

    public static ProductResponse from(com.ceyiz.app.entity.Product product) {
        return from(product, List.of());
    }

    public static ProductResponse from(com.ceyiz.app.entity.Product product, List<Part> parts) {
        return new ProductResponse(product.getId(), product.getName(), product.getStatus(), product.getUrl(),
                parts.stream().mapToInt(Part::quantity).sum(), parts);
    }
}
