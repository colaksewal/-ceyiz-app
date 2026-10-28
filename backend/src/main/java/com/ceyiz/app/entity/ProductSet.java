package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Entity
@Table(name = "product_sets")
public class ProductSet {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(nullable = false)
    private String name;

    @Column(name = "store_name")
    private String storeName;

    @Column(name = "set_price", nullable = false)
    private BigDecimal setPrice;

    // Katalog setinden eklenmişse hangi setten geldiği; elle girilen sette null.
    @Column(name = "set_template_id")
    private UUID setTemplateId;

    // Seçilen fiyatın tipi; taksitliyse sayı ve tutar. Eski/elle girilen setlerde null.
    @Enumerated(EnumType.STRING)
    @Column(name = "price_type")
    private PriceType priceType;

    @Column(name = "installment_count")
    private Integer installmentCount;

    @Column(name = "installment_amount")
    private BigDecimal installmentAmount;

    // true: set listede tek ürün olarak eklendi (Product.productSetId); fiyatı ürünün fiyat notlarında durur,
    // özet ve ödeme planında ayrıca sayılmaz.
    @Column(name = "as_product", nullable = false)
    private boolean asProduct = false;

    protected ProductSet() {}

    public void markAsProduct() {
        this.asProduct = true;
    }

    public ProductSet(UUID listId, String name, String storeName, BigDecimal setPrice, UUID setTemplateId,
                      PriceType priceType, Integer installmentCount, BigDecimal installmentAmount) {
        this(listId, name, storeName, setPrice);
        this.setTemplateId = setTemplateId;
        this.priceType = priceType;
        this.installmentCount = installmentCount;
        this.installmentAmount = installmentAmount;
    }

    public ProductSet(UUID listId, String name, String storeName, BigDecimal setPrice) {
        this.listId = listId;
        this.name = name;
        this.storeName = storeName;
        this.setPrice = setPrice;
    }
}