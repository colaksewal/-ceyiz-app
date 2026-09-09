package com.ceyiz.app.service;

import com.ceyiz.app.entity.ShareRole;
import com.ceyiz.app.entity.TrousseauList;

/**
 * ListService içinde owner + paylaşılan listeleri tek bir sonuç kümesinde birleştirip
 * her birinin rolünü taşımak için kullanılan geçici taşıyıcı — JSON'a değil, controller'a
 * gider, orada ListResponse.from(...) ile DTO'ya çevrilir.
 */
public record ListWithRole(TrousseauList list, ShareRole role) {
}
