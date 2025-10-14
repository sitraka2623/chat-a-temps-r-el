package com.example.Chat.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class WebSocketController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Recevoir l'offre d'un utilisateur et la diffuser à l'autre utilisateur via WebSocket
    @PostMapping("/offer")
    public void handleOffer(@RequestBody String offer) {
        System.out.println("Offre reçue: " + offer);
        // Diffuser l'offre sur le WebSocket à l'autre utilisateur
        messagingTemplate.convertAndSend("/topic/public", offer);
    }

    // Recevoir la réponse d'un utilisateur et la diffuser à l'autre utilisateur via WebSocket
    @PostMapping("/answer")
    public void handleAnswer(@RequestBody String answer) {
        System.out.println("Réponse reçue: " + answer);
        // Diffuser la réponse sur le WebSocket à l'autre utilisateur
        messagingTemplate.convertAndSend("/topic/public", answer);
    }

    // Recevoir les candidats ICE et les diffuser via WebSocket
    @PostMapping("/ice-candidate")
    public void handleIceCandidate(@RequestBody String candidate) {
        System.out.println("Candidat ICE reçu: " + candidate);
        // Diffuser le candidat ICE sur le WebSocket à l'autre utilisateur
        messagingTemplate.convertAndSend("/topic/public", candidate);
    }
}
