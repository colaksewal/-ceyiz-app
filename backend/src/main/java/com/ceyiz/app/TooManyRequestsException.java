package com.ceyiz.app;

/** 429'a çevrilir: kullanıcı ya da sunucu aynı anda kaldırabileceğinden fazla iş istedi. */
public class TooManyRequestsException extends RuntimeException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
