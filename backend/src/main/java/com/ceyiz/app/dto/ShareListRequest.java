package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ShareRole;

public record ShareListRequest(String email, ShareRole role) {
}
