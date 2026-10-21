package com.ceyiz.app.repository;

import com.ceyiz.app.entity.SetTemplatePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SetTemplatePriceRepository extends JpaRepository<SetTemplatePrice, UUID> {

    List<SetTemplatePrice> findBySetTemplateIdOrderByDisplayOrder(UUID setTemplateId);
}
