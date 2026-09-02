package com.ceyiz.app.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.xml.crypto.Data;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService (@Value("${JWT_SECRET}") String secret, @Value("${JWT_EXPIRATION_MS}") long expirationMs){

        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs =expirationMs;
    }

    public String generateToken(String userId){
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder().subject(userId).issuedAt(now).expiration(expiry).signWith(key).compact();
    }

    public String extractUserId(String token){
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
}
