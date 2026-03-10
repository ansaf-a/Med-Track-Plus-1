package com.medical.backend.service;

import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.repository.PrescriptionAuditRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saves PrescriptionAudit records in a REQUIRES_NEW transaction so that
 * audit failures never roll back the parent prescription transaction.
 */
@Service
public class AuditPersistenceService {

    @Autowired
    private PrescriptionAuditRepository prescriptionAuditRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAudit(PrescriptionAudit audit) {
        prescriptionAuditRepository.save(audit);
    }
}
