import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DoseAction {
  id: number;
  time: string;
  action: 'TAKEN' | 'SNOOZED' | 'MISSED' | 'PENDING';
  slot: string;
  actualTime?: string;
}

interface AuditLog {
  timestamp: Date;
  event: string;
  version: string;
  status: string;
}

@Component({
  selector: 'app-adherence-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adherence-simulator.component.html',
  styleUrls: ['./adherence-simulator.component.css']
})
export class AdherenceSimulatorComponent implements OnInit {

  // Doctor defined constraints
  medicineName = 'Amoxicillin 500mg';
  instruction = 'AFTER_FOOD';

  // Patient defined times
  patientTimes = {
    breakfast: '08:30',
    lunch: '13:30',
    dinner: '20:30'
  };

  scheduleVersion = 'v1.0';

  todayDoses: DoseAction[] = [];
  auditLogs: AuditLog[] = [];

  adherenceRate: number = 0;

  ngOnInit() {
    this.generateSchedule();
  }

  generateSchedule() {
    this.todayDoses = [
      { id: 1, slot: 'Breakfast', time: this.patientTimes.breakfast, action: 'PENDING' },
      { id: 2, slot: 'Lunch', time: this.patientTimes.lunch, action: 'PENDING' },
      { id: 3, slot: 'Dinner', time: this.patientTimes.dinner, action: 'PENDING' }
    ];
    this.calculateAdherence();
    this.logEvent(`Generated daily schedule for ${this.medicineName}`, 'CREATED');
  }

  updateTimes() {
    this.scheduleVersion = 'v1.1';
    this.generateSchedule();
    this.logEvent(`Patient updated meal times`, 'UPDATED');
  }

  takeDose(dose: DoseAction) {
    dose.action = 'TAKEN';
    dose.actualTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.calculateAdherence();
    this.logEvent(`Dose taken for ${dose.slot} at ${dose.actualTime}`, 'TAKEN');
  }

  snoozeDose(dose: DoseAction) {
    dose.action = 'SNOOZED';

    // Parse current time, add 15 mins for the new ghost dose
    const [hours, minutes] = dose.time.split(':').map(Number);
    let d = new Date();
    d.setHours(hours, minutes + 15, 0);
    const newTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // Insert a new pending dose for the snoozed time
    const newDose: DoseAction = {
      id: Date.now(),
      slot: `${dose.slot} (Snoozed)`,
      time: newTime,
      action: 'PENDING'
    };

    const index = this.todayDoses.findIndex(d => d.id === dose.id);
    this.todayDoses.splice(index + 1, 0, newDose);

    this.calculateAdherence();
    this.logEvent(`Snoozed ${dose.slot} dose by 15 mins to ${newTime}`, 'SNOOZED');
  }

  missDose(dose: DoseAction) {
    dose.action = 'MISSED';
    this.calculateAdherence();
    this.logEvent(`Missed dose for ${dose.slot}`, 'MISSED');
  }

  calculateAdherence() {
    const totalExpected = this.todayDoses.filter(d => !d.slot.includes('Snoozed')).length;
    const taken = this.todayDoses.filter(d => d.action === 'TAKEN').length;

    if (totalExpected === 0) {
      this.adherenceRate = 0;
    } else {
      this.adherenceRate = Math.round((taken / totalExpected) * 100);
    }
  }

  logEvent(event: string, status: string) {
    this.auditLogs.unshift({
      timestamp: new Date(),
      event,
      version: this.scheduleVersion,
      status
    });
  }

  getDashOffset(progress: number): number {
    const circumference = 2 * Math.PI * 55;
    return circumference - ((progress / 100) * circumference);
  }
}
