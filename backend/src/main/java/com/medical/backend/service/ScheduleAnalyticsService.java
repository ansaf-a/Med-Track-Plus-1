package com.medical.backend.service;

import com.medical.backend.dto.ScheduleAnalyticsDTO;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.MedicationSchedule;
import com.medical.backend.entity.User;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.MedicationScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScheduleAnalyticsService {

    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private MedicationScheduleRepository scheduleRepo;

    public List<ScheduleAnalyticsDTO> getAdherenceRates() {
        LocalDateTime start = LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime end = LocalDateTime.now();

        List<MedicationSchedule> allSchedules = scheduleRepo.findAll();
        Map<Long, User> patientMap = allSchedules.stream()
                .map(MedicationSchedule::getPatient)
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<ScheduleAnalyticsDTO> result = new ArrayList<>();
        for (User patient : patientMap.values()) {
            List<DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
            if (logs.isEmpty())
                continue;

            long total = logs.size();
            long taken = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.TAKEN).count();
            long missed = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.MISSED).count();
            long skipped = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.SKIPPED).count();
            double adherence = total > 0 ? (taken * 100.0 / total) : 0.0;

            ScheduleAnalyticsDTO dto = new ScheduleAnalyticsDTO();
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getFullName() != null ? patient.getFullName() : patient.getEmail());
            dto.setTotalDoses(total);
            dto.setTakenCount(taken);
            dto.setMissedCount(missed);
            dto.setSkippedCount(skipped);
            dto.setAdherencePercent(Math.round(adherence * 10.0) / 10.0);
            dto.setHighMissRate(total > 0 && (missed * 100.0 / total) > 30.0);
            result.add(dto);
        }

        result.sort(Comparator.comparingDouble(ScheduleAnalyticsDTO::getAdherencePercent));
        return result;
    }

    public List<Map<String, Object>> getTopScheduledMedicines() {
        return doseLogRepo.findAll().stream()
                .collect(Collectors.groupingBy(
                        l -> l.getScheduleItem().getMedicineName(),
                        Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("medicineName", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
    }

    public List<ScheduleAnalyticsDTO> getHighMissRatePatients() {
        return getAdherenceRates().stream()
                .filter(ScheduleAnalyticsDTO::isHighMissRate)
                .collect(Collectors.toList());
    }

    /**
     * Returns the 30-day adherence percentage for a specific patient identified
     * by email. Used by the patient-facing /my-adherence API.
     */
    public double getPatientAdherence(String email) {
        com.medical.backend.entity.User patient = scheduleRepo.findAll().stream()
                .map(com.medical.backend.entity.MedicationSchedule::getPatient)
                .filter(u -> email.equalsIgnoreCase(u.getEmail()))
                .findFirst().orElse(null);
        if (patient == null)
            return 0.0;

        LocalDateTime start = LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime end = LocalDateTime.now();
        List<com.medical.backend.entity.DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
        if (logs.isEmpty())
            return 0.0;

        long total = logs.stream()
                .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now().plusMinutes(1)))
                .count();
        long taken = logs.stream()
                .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now().plusMinutes(1)))
                .filter(l -> l.getStatus() == com.medical.backend.entity.DoseLog.DoseStatus.TAKEN)
                .count();
        if (total == 0)
            return 0.0;
        double pct = Math.round((taken * 100.0 / total) * 10.0) / 10.0;
        return pct;
    }

    /**
     * Returns a list of daily adherence points for a specific patient.
     * Used for rendering the Adherence Trend Line Chart.
     * Returns Map of "date" (String YYYY-MM-DD) -> "percent" (Double)
     */
    public List<Map<String, Object>> getAdherenceTrend(Long patientId, int days) {
        User patient = scheduleRepo.findAll().stream()
                .map(MedicationSchedule::getPatient)
                .filter(u -> u.getId().equals(patientId))
                .findFirst().orElse(null);

        if (patient == null) {
            return new ArrayList<>();
        }

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<DoseLog> allLogs = doseLogRepo.findByPatientAndDateRange(patient, start, end);

        // Group logs by Date string (YYYY-MM-DD)
        Map<String, List<DoseLog>> groupedLogs = allLogs.stream()
                .collect(Collectors.groupingBy(log -> log.getScheduledTime().toLocalDate().toString()));

        List<Map<String, Object>> trend = new ArrayList<>();

        // Loop through each day from start to end (to include days with 0 scheduled
        // doses)
        for (int i = days; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateString = date.toString();
            List<DoseLog> dailyLogs = groupedLogs.getOrDefault(dateString, new ArrayList<>());

            long totalScheduledForDay = dailyLogs.size();
            long takenForDay = dailyLogs.stream()
                    .filter(l -> l.getStatus() == com.medical.backend.entity.DoseLog.DoseStatus.TAKEN)
                    .count();

            double adherence = 0.0;
            if (totalScheduledForDay > 0) {
                adherence = Math.round((takenForDay * 100.0 / totalScheduledForDay) * 10.0) / 10.0;
            } else if (!trend.isEmpty()) {
                // carry forward previous day's adherence if no meds scheduled today
                adherence = (Double) trend.get(trend.size() - 1).get("percent");
            } else {
                adherence = 100.0; // Assume 100% adherence if nothing scheduled yet
            }

            trend.add(Map.of(
                    "date", dateString,
                    "percent", adherence));
        }

        return trend;
    }
}
