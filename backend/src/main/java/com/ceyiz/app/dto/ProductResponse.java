package com.ceyiz.app.dto;
import java.util.UUID;
import com.ceyiz.app.entity.ProductStatus;

public record ProductResponse(UUID id, String name, ProductStatus status) {

    public static ProductResponse from(com.ceyiz.app.entity.Product product){
        return new ProductResponse(product.getId(), product.getName(), product.getStatus());
    }

}
