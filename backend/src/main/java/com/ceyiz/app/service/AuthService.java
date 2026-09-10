package com.ceyiz.app.service;

import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.UserRepository;
import com.ceyiz.app.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    public User register(String email, String rawPassword, String name){
        if(userRepository.findByEmail(email).isPresent()){
            throw new IllegalArgumentException("Bu email adresi zaten kayıtlı");
        }

        String hashedPassword = passwordEncoder.encode(rawPassword);
        User user = new User(email, hashedPassword, name);

        return userRepository.save(user);
    }

    public String login (String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email veya şifre hatalıdır"));

        if(!passwordEncoder.matches(rawPassword ,user.getPasswordHash())){
            throw new IllegalArgumentException("Email veya şifre hatalıdır");
        }

        return jwtService.generateToken(user.getId().toString(), user.isAdmin());
    }



}
