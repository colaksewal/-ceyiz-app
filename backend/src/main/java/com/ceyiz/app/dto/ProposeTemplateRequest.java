package com.ceyiz.app.dto;

import java.util.UUID;

/** Kullanıcı listesini şablon olarak önerir: başlık (ör. "Çeyiz listem") ve admine bir not. */
public record ProposeTemplateRequest(UUID listId, String title, String note) {}
