package com.example.Chat.repository;

import com.example.Chat.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {


    List<ChatMessage> findBySender(String sender);

    List<ChatMessage> findAllByOrderByTimeAsc();

    List<ChatMessage> findAllByOrderByTimeDesc();

    List<ChatMessage> findByType(ChatMessage.MessageType type);

    List<ChatMessage> findBySenderOrderByTimeDesc(String sender);
}

