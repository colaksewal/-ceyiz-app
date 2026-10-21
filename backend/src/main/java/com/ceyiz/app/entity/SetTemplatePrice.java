package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Entity
@Table(name = "set_template_prices")
public class SetTemplatePrice {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "set_template_id", nullable = false)
    private UUID setTemplateId;

    @Column(name = "store_name")
    private String storeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_type", nullable = false)
    private PriceType priceType;

    @Column(name = "cash_price")
    private BigDecimal cashPrice;

    @Column(name = "installment_count")
    private Integer installmentCount;

    @Column(name = "installment_amount")
    private BigDecimal installmentAmount;

    @Column(name = "payment_plan_note")
    private String paymentPlanNote;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected SetTemplatePrice() {}

    public SetTemplatePrice(UUID setTemplateId, String storeName, PriceType priceType, BigDecimal cashPrice,
                            Integer installmentCount, BigDecimal installmentAmount, String paymentPlanNote,
                            int displayOrder) {
        this.setTemplateId = setTemplateId;
        this.storeName = storeName;
        this.priceType = priceType;
        this.cashPrice = cashPrice;
        this.installmentCount = installmentCount;
        this.installmentAmount = installmentAmount;
        this.paymentPlanNote = paymentPlanNote;
        this.displayOrder = displayOrder;
    }
}
