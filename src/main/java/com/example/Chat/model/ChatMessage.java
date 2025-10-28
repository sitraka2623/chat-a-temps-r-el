package com.example.Chat.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity
@Table(name = "chat_messages")

public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Getter
    @Setter
    private Long id;

    @Getter
    @Setter
    private String content;

    @Getter
    @Setter
    private String sender;

    @Enumerated(EnumType.STRING)
    private MessageType type;

    @Getter
    @Setter
    private String time;


    @Setter
    private String fileUrl;

    public String getFileUrl() {
        return fileUrl;
    }


    public enum MessageType {
        CHAT, LEAVE, JOIN, FILE
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }
}