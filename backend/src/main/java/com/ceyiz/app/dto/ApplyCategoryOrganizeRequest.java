package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/** Kullanıcının onayladığı düzen. merges: keepId kalır, removeIds ona birleştirilip silinir. */
public record ApplyCategoryOrganizeRequest(List<Group> groups, List<Merge> merges) {

    public record Group(String name, List<UUID> productIds) {}

    public record Merge(UUID keepId, List<UUID> removeIds) {}
}
