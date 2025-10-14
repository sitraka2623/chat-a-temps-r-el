package com.example.Chat.service;


import com.example.Chat.model.ChatMessage;
import com.example.Chat.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatMessageService {

    @Autowired
    private ChatMessageRepository repository;

    // Récupérer tous les messages
    public List<ChatMessage> findAll() {
        return repository.findAll();
    }

    // Sauvegarder un message
    public ChatMessage save(ChatMessage message) {
        return repository.save(message);
    }

    // Récupérer tous les messages (c'est la même méthode que 'findAll')
    public List<ChatMessage> getAllMessages() {
        return findAll();  // Utilisation de la méthode findAll()
    }
}
