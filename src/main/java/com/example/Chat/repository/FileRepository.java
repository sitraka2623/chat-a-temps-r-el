package com.example.Chat.repository;

import com.example.Chat.model.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {
    // Requête pour récupérer le fichier par son id, par exemple
    Optional<FileEntity> findById(Long id);
}