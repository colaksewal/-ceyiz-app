package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name = "set_templates")
public class SetTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String brand;

    @Column(name = "image_url")
    private String imageUrl;

    // Setin ürün sayfası linki (opsiyonel).
    private String url;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    // Kullanıcının kendi seti sadece ona görünür; admin setleri (createdByAdmin) herkese.
    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_by_admin", nullable = false)
    private boolean createdByAdmin;

    // DB'deki DEFAULT now() devreye girmez: Hibernate INSERT'te tüm kolonları açıkça gönderir.
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SetTemplate() {}

    public SetTemplate(String name, String brand, String imageUrl, String url, int displayOrder,
                       UUID createdBy, boolean createdByAdmin) {
        this.name = name;
        this.brand = brand;
        this.imageUrl = imageUrl;
        this.url = url;
        this.displayOrder = displayOrder;
        this.createdBy = createdBy;
        this.createdByAdmin = createdByAdmin;
    }

    // Sahibi, sırası ve oluşturulma zamanı düzenlemede değişmez.
    public void update(String name, String brand, String imageUrl, String url) {
        this.name = name;
        this.brand = brand;
        this.imageUrl = imageUrl;
        this.url = url;
    }
}
