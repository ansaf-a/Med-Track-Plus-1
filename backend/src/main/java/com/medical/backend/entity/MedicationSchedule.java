package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "medication_schedules")
public class MedicationSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    private String scheduleName;

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private ScheduleStatus status = ScheduleStatus.ACTIVE;

    @Version
    private Long version = 0L;

    /**
     * Semantic audit version string (e.g. "1.0", "1.1"). Updated after doctor
     * edits.
     */
    @Column(name = "audit_version")
    private String auditVersion = "1.0";

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "modified_by")
    private User modifiedBy;

    public enum ScheduleStatus {
        ACTIVE, PAUSED, COMPLETED, CANCELLED
    }
}
