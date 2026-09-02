package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name="price_entries")
public class PriceEntry {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name="product_id" ,nullable = false)
    private UUID productId;

    @Column(name="store_name" ,nullable = false )
    private String storeName;

    @Enumerated(EnumType.STRING )
    @Column(name= "price_type" ,nullable = false)
    private PriceType priceType;

    @Column(name="cash_price")
    private BigDecimal cashPrice;

    @Column(name="installment_count")
    private Integer  installmentCount;

    @Column(name="installment_amount")
    private BigDecimal  installmentAmount;

    @Column(name="payment_plan_note")
    private String paymentPlanNote ;

    @Column(name="photo_url")
    private String photoUrl;

    @Column(name = "visited_at")
    private Instant visitedAt = Instant.now();

    @Column(name="is_preferred" ,nullable = false)
    private boolean isPreferred = false;


    protected PriceEntry(){}

    public PriceEntry(UUID productId, String storeName, PriceType priceType, BigDecimal cashPrice, Integer installmentCount, BigDecimal installmentAmount, String paymentPlanNote, String photoUrl){
        this.productId = productId;
        this.storeName = storeName;
        this.priceType = priceType;
        this.cashPrice = cashPrice;
        this.installmentCount = installmentCount;
        this.installmentAmount = installmentAmount;
        this.paymentPlanNote = paymentPlanNote;
        this.photoUrl = photoUrl;
    }


    public void markAsPreferred() {
        this.isPreferred = true;
    }

    public void unmarkAsPreferred() {
        this.isPreferred = false;
    }


}
