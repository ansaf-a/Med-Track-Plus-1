package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "system_audit")
public class SystemAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;
    private String details;

    private Long adminId;
    private String adminEmail;

    private LocalDateTime timestamp;

    /** Human-readable semantic version: v1.0, v1.1, v1.2 … */
    private String versionLabel = "1.1";

    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}
