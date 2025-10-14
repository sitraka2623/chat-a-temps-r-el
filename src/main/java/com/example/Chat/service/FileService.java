package com.example.Chat.service;


import com.example.Chat.model.FileEntity;
import com.example.Chat.repository.FileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@Service
public class FileService {

    @Autowired
    private FileRepository fileRepository; // Le repository pour accéder à la base de données

    public FileEntity saveFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("Le fichier est vide");
        }

        FileEntity fileEntity = new FileEntity();
        fileEntity.setFileName(file.getOriginalFilename());
        fileEntity.setFileType(file.getContentType());
        fileEntity.setFileData(file.getBytes()); // Conversion du fichier en tableau de bytes

        // Sauvegarde dans la base de données
        return fileRepository.save(fileEntity);
    }

    // Méthode pour récupérer un fichier par ID
    public Optional<FileEntity> getFile(Long id) {
        return fileRepository.findById(id);
    }
}

