package com.medical.backend.config;

import com.medical.backend.entity.Role;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner startDatabase(UserRepository repository,
            com.medical.backend.repository.PrescriptionRepository prescriptionRepository,
            com.medical.backend.repository.PrescriptionItemRepository itemRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            // Ensure MedTrack Admin exists — always re-encode password so stale/plain-text
            // passwords are fixed
            User admin = repository.findByEmail("admin@medtrack.com").orElseGet(() -> {
                User a = new User();
                a.setEmail("admin@medtrack.com");
                a.setRole(Role.ADMIN);
                a.setFullName("System Admin");
                a.setVerified(true);
                return a;
            });
            admin.setPassword(passwordEncoder.encode("password"));
            repository.save(admin);

            // Ensure Doctor exists — always re-encode password
            User doctor = repository.findByEmail("doctor@example.com").orElseGet(() -> {
                User d = new User();
                d.setEmail("doctor@example.com");
                d.setRole(Role.DOCTOR);
                d.setFullName("Dr. Alex Spreadsheet");
                d.setMedicalLicenseNumber("MD-12345");
                d.setSpecialization("General Physician");
                d.setVerified(true);
                return d;
            });
            doctor.setPassword(passwordEncoder.encode("password"));
            doctor = repository.save(doctor);

            // Ensure Patient console.leo@gmail.com exists — always re-encode password
            User leo = repository.findByEmail("console.leo@gmail.com").orElseGet(() -> {
                User p = new User();
                p.setEmail("console.leo@gmail.com");
                p.setRole(Role.PATIENT);
                p.setFullName("Console Leo");
                p.setMedicalHistory("Regular health checkups.");
                p.setVerified(true);
                return p;
            });
            leo.setPassword(passwordEncoder.encode("password"));
            leo = repository.save(leo);

            // Seed dummy prescriptions for console.leo@gmail.com if none exist
            if (prescriptionRepository.findByPatient_Id(leo.getId()).isEmpty()) {
                // Rx 1: Active
                com.medical.backend.entity.Prescription rx1 = new com.medical.backend.entity.Prescription();
                rx1.setPatient(leo);
                rx1.setDoctor(doctor);
                rx1.setStatus(com.medical.backend.entity.Prescription.PrescriptionStatus.ISSUED);
                rx1.setDigitalSignature("SIG_LEO_001");
                rx1 = prescriptionRepository.save(rx1);

                com.medical.backend.entity.PrescriptionItem item1 = new com.medical.backend.entity.PrescriptionItem();
                item1.setPrescription(rx1);
                item1.setMedicineName("Amoxicillin");
                item1.setDosage("500mg");
                item1.setQuantity(20);
                item1.setDosageTiming("Morning,Night");
                item1.setStartDate(java.time.LocalDate.now());
                item1.setEndDate(java.time.LocalDate.now().plusDays(10));
                itemRepository.save(item1);

                // Rx 2: Processing
                com.medical.backend.entity.Prescription rx2 = new com.medical.backend.entity.Prescription();
                rx2.setPatient(leo);
                rx2.setDoctor(doctor);
                rx2.setStatus(com.medical.backend.entity.Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST);
                rx2.setDigitalSignature("SIG_LEO_002");
                rx2 = prescriptionRepository.save(rx2);

                com.medical.backend.entity.PrescriptionItem item2 = new com.medical.backend.entity.PrescriptionItem();
                item2.setPrescription(rx2);
                item2.setMedicineName("Lisinopril");
                item2.setDosage("10mg");
                item2.setQuantity(30);
                item2.setDosageTiming("Morning");
                item2.setStartDate(java.time.LocalDate.now().minusDays(5));
                item2.setEndDate(java.time.LocalDate.now().plusDays(25));
                itemRepository.save(item2);

                System.out.println("Seeded dummy prescriptions for console.leo@gmail.com");
            }
        };
    }
}
