package com.example.Chat.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable()) // Désactive CSRF
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/files/upload", "/login").permitAll()
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .permitAll()
                )
                .logout(logout -> logout
                        .permitAll()
                )
                .build();
    }

}

