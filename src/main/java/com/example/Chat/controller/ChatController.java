package com.example.Chat.controller;

import com.example.Chat.model.ChatMessage;
import com.example.Chat.service.ChatMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;

@Controller
public class ChatController {
    @Autowired
    private ChatMessageService chatMessageService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Gère l'inscription d'un utilisateur au chat
    @MessageMapping("/chat.register")
    @SendTo("/topic/public")
    public ChatMessage register(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        Objects.requireNonNull(headerAccessor.getSessionAttributes()).put("username", chatMessage.getSender());
        return chatMessageService.save(chatMessage);
    }

    // Gère l'envoi d'un message
    @MessageMapping("/chat.send")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        try {
            return chatMessageService.save(chatMessage);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi du message : " + e.getMessage());
            return null;
        }
    }

    // Gère l'upload de fichiers
    @PostMapping("/files/upload")
    public ResponseEntity<Object> uploadFile(@RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Aucun fichier sélectionné.");
        }

        try {
            // Définir le répertoire de stockage
            Path uploadPath = Paths.get("uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Vérifier les permissions
            if (!Files.isWritable(uploadPath)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Répertoire non accessible en écriture.");
            }

            // Générer un nom unique pour le fichier
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);

            // Sauvegarder le fichier sur le disque
            file.transferTo(filePath);

            // Log de l'opération de sauvegarde
            System.out.println("Fichier sauvegardé à : " + filePath.toString());

            // Créer un message avec l'URL du fichier
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setFileUrl("/uploads/" + fileName);
            chatMessage.setContent("Un fichier a été téléchargé");
            chatMessage.setType(ChatMessage.MessageType.FILE);

            // Sauvegarde du message
            ChatMessage savedMessage = chatMessageService.save(chatMessage);

            // Envoyer le message WebSocket aux utilisateurs connectés
            messagingTemplate.convertAndSend("/topic/public", savedMessage);

            // Retourner une réponse avec l'URL du fichier
            return ResponseEntity.ok().body(new Object() {
                public String fileUrl = "/uploads/" + fileName;
            });
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur lors du téléchargement du fichier.");
        }
    }

    // Récupérer la liste des fichiers
    @GetMapping("/files")
    public ResponseEntity<List<ChatMessage>> getAllFiles() {
        List<ChatMessage> files = chatMessageService.getAllMessages()
                .stream()
                .filter(msg -> msg.getFileUrl() != null)
                .toList();
        return ResponseEntity.ok(files);
    }
}