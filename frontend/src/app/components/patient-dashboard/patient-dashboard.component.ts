import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PrescriptionService } from '../../services/prescription.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { AdherenceService } from '../../services/adherence.service';
import { DoctorService, DoctorUser } from '../../services/doctor.service';
import { Prescription } from '../../models/prescription.model';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';

import { VitalsChartComponent } from '../vitals-chart/vitals-chart.component';
import { SosCardComponent } from '../sos-card/sos-card.component';
import { AdherenceGaugeComponent } from '../adherence-gauge/adherence-gauge.component';
import { RenewalService } from '../../services/renewal.service';
import { DoseLogService, DoseLog } from '../../services/dose-log.service';
import { MedScheduleService, MedicationSchedule, PatientMealPrefs, MedScheduleRequest } from '../../services/med-schedule.service';

@Component({
    selector: 'app-patient-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, VitalsChartComponent, SosCardComponent, AdherenceGaugeComponent],
    templateUrl: './patient-dashboard.component.html',
    styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('trendChartCanvas') trendChartCanvas!: ElementRef;
    trendChart: any;
    activePrescriptions: Prescription[] = [];
    dispensedPrescriptions: Prescription[] = [];
    notifications: Notification[] = [];
    appointments: Appointment[] = [];
    userName: string = '';
    userId: number | null = null;
    loading = true;
    selectedHistory: any[] | null = null;
    adherenceLogs: any[] = []; // Store logs
    myAdherence30Days: number = 0;

    // Live Dose Alerts
    dueDoses: DoseLog[] = [];

    // Temporal Adherence Blocks
    adherenceBlocks: any[] = [];
    selectedBlock: any = null;

    private pollSub?: Subscription;
    private doseCheckSub?: Subscription;

    // For Appointment Modal
    showAppointmentModal = false;
    newAppointmentDate: string = '';
    newAppointmentNotes: string = '';
    selectedDoctorId: number | null = null;
    doctors: DoctorUser[] = [];

    // Active sidebar section
    activeSection: string = 'overview';

    // Live Schedule Timers
    mySchedules: MedicationSchedule[] = [];
    showScheduleModal = false;
    scheduleTargetPrescription: Prescription | null = null;
    schedulePrefs: PatientMealPrefs = {
        breakfastTime: '08:30',
        lunchTime: '13:00',
        dinnerTime: '20:00',
        preMealOffsetMinutes: 15
    };

    constructor(
        private prescriptionService: PrescriptionService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private appointmentService: AppointmentService,
        private adherenceService: AdherenceService,
        private renewalService: RenewalService,
        private doctorService: DoctorService,
        private doseLogService: DoseLogService,
        private medScheduleService: MedScheduleService
    ) { }

    ngOnInit(): void {
        const profile = this.authService.getProfile();
        this.userName = profile?.fullName || 'Patient';
        this.userId = profile?.id ? Number(profile.id) : null;
        this.loadData();
        this.doctorService.getAllDoctors().subscribe({
            next: (data) => this.doctors = data,
            error: (err) => console.error('Error loading doctors', err)
        });

        this.pollSub = interval(10000).subscribe(() => this.fetchNotifications());
        this.doseCheckSub = interval(60000).subscribe(() => this.checkDueDoses());

        // Initial check
        this.checkDueDoses();
    }

    ngOnDestroy(): void {
        if (this.pollSub) this.pollSub.unsubscribe();
        if (this.doseCheckSub) this.doseCheckSub.unsubscribe();
        if (this.trendChart) this.trendChart.destroy();
    }

    ngAfterViewInit(): void {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#636e72';
    }

    checkDueDoses(): void {
        this.doseLogService.getTodaysDoses().subscribe({
            next: (doses) => {
                const now = new Date();
                this.dueDoses = doses.filter(d => {
                    if (d.status !== 'PENDING') return false;
                    const schedTime = this.parseDate(d.scheduledTime);
                    if (!schedTime) return false;
                    // Trigger alert if it's currently at or past the scheduled time 
                    // AND less than 4 hours past (we don't alert for yesterday's missed doses continuously)
                    const diffMs = now.getTime() - schedTime.getTime();
                    return diffMs >= 0 && diffMs < (4 * 60 * 60 * 1000);
                });
            },
            error: (err) => console.error('Error fetching due doses:', err)
        });
    }

    takeDoseAlert(dose: DoseLog): void {
        this.doseLogService.markDose(dose.doseId, 'TAKEN').subscribe({
            next: () => {
                this.checkDueDoses();
                this.loadData(); // refresh adherence stats
            }
        });
    }

    snoozeDoseAlert(dose: DoseLog): void {
        this.doseLogService.snoozeDose(dose.doseId).subscribe({
            next: () => {
                this.checkDueDoses();
            }
        });
    }

    fetchNotifications(): void {
        this.notificationService.getMyNotifications().subscribe({
            next: (data) => {
                this.notifications = data.filter(n => !n.read).slice(0, 5);
            },
            error: (err) => console.error('Error fetching notifications', err)
        });
    }

    overallAdherence: number = 0;

    calculateOverallAdherence(): void {
        if (this.activePrescriptions.length === 0) {
            this.overallAdherence = 0;
            return;
        }
        const total = this.activePrescriptions.reduce((sum, p) => sum + this.getDosageProgress(p), 0);
        this.overallAdherence = Math.round(total / this.activePrescriptions.length);
    }

    loadData(): void {
        this.loading = true;
        this.prescriptionService.getMyPrescriptions().subscribe({
            next: (data) => {
                console.log('Raw API Prescriptions:', data);
                this.activePrescriptions = data.filter(p => p.status === 'ISSUED' || p.status === 'PENDING' || p.status === 'PROCEEDED_TO_PHARMACIST' || p.status === 'DISPENSED');
                this.dispensedPrescriptions = data.filter(p => p.status === 'DISPENSED');
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error fetching prescriptions', err);
                this.loading = false;
            }
        });

        this.fetchNotifications();

        if (this.userId) {
            this.medScheduleService.getMySchedules().subscribe({
                next: (data) => this.mySchedules = data,
                error: (err) => console.error('Error fetching schedules', err)
            });

            this.adherenceService.getPatientLogs(this.userId).subscribe({
                next: (data) => {
                    this.adherenceLogs = data;
                },
                error: (err) => console.error('Error fetching adherence logs', err),
                complete: () => this.calculateOverallAdherence()
            });

            this.appointmentService.getPatientAppointments(this.userId).subscribe({
                next: (data) => this.appointments = data,
                error: (err) => console.error('Error fetching appointments', err)
            });

            this.doseLogService.getMyAdherenceStats().subscribe({
                next: (stats) => this.myAdherence30Days = stats.percent,
                error: (err) => console.error('Error fetching 30-day adherence', err)
            });

            this.adherenceService.getMyAdherenceTrend(14).subscribe({
                next: (trendData) => {
                    setTimeout(() => this.renderTrendChart(trendData), 100);
                },
                error: (err) => console.error('Error fetching adherence trend', err)
            });

            // Load temporal adherence blocks
            this.doseLogService.getAdherenceBlocks().subscribe({
                next: (blocks) => this.adherenceBlocks = blocks,
                error: (err) => console.error('Error fetching adherence blocks', err)
            });
        }
    }

    renderTrendChart(data: any[]): void {
        if (!this.trendChartCanvas) return;

        const labels = data.map(d => {
            const dateObj = new Date(d.date);
            return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        const values = data.map(d => d.percent);

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        this.trendChart = new Chart(this.trendChartCanvas.nativeElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Adherence %',
                    data: values,
                    borderColor: '#0984e3',
                    backgroundColor: 'rgba(9, 132, 227, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0984e3',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context: any) {
                                return context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    openAppointmentModal(): void {
        this.showAppointmentModal = true;
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.newAppointmentDate = tomorrow.toISOString().slice(0, 16); // Format for datetime-local
    }

    closeAppointmentModal(): void {
        this.showAppointmentModal = false;
    }

    submitAppointment(): void {
        if (!this.userId) return;

        const request = {
            patientId: this.userId,
            doctorId: this.selectedDoctorId,
            appointmentDate: this.newAppointmentDate,
            notes: this.newAppointmentNotes
        };

        this.appointmentService.requestAppointment(request).subscribe({
            next: (res) => {
                alert('Appointment requested successfully!');
                this.closeAppointmentModal();
                this.loadData(); // Reload to show new appointment
            },
            error: (err) => {
                console.error('Error requesting appointment', err);
                alert('Failed to request appointment.');
            }
        });
    }

    logAdherence(prescription: Prescription): void {
        if (!this.userId || !prescription.id) return;

        if (confirm('Did you take your medication for today?')) {
            this.adherenceService.logAdherence(this.userId, prescription.id).subscribe({
                next: (res) => {
                    alert('Medication logged successfully!');
                    // Ideally update only the specific item or adherence stat
                },
                error: (err) => console.error('Error logging adherence', err)
            });
        }
    }

    // --- Schedule Timers ---

    hasActiveSchedule(prescriptionId?: number): boolean {
        if (!prescriptionId) return false;
        return this.mySchedules.some(s => s.prescription && s.prescription.id === prescriptionId && s.status === 'ACTIVE');
    }

    openScheduleModal(prescription: Prescription): void {
        this.scheduleTargetPrescription = prescription;
        this.medScheduleService.getMealPrefs().subscribe({
            next: (prefs) => {
                if (prefs && prefs.breakfastTime) {
                    this.schedulePrefs = prefs;
                    if (this.schedulePrefs.breakfastTime.length > 5) this.schedulePrefs.breakfastTime = this.schedulePrefs.breakfastTime.substring(0, 5);
                    if (this.schedulePrefs.lunchTime.length > 5) this.schedulePrefs.lunchTime = this.schedulePrefs.lunchTime.substring(0, 5);
                    if (this.schedulePrefs.dinnerTime.length > 5) this.schedulePrefs.dinnerTime = this.schedulePrefs.dinnerTime.substring(0, 5);
                }
                this.showScheduleModal = true;
            },
            error: () => this.showScheduleModal = true // Open with defaults if error
        });
    }

    closeScheduleModal(): void {
        this.showScheduleModal = false;
        this.scheduleTargetPrescription = null;
    }

    submitSchedule(): void {
        if (!this.scheduleTargetPrescription || !this.scheduleTargetPrescription.id) return;

        const req: MedScheduleRequest = {
            prescriptionId: this.scheduleTargetPrescription.id,
            startDate: new Date().toISOString().split('T')[0],
            breakfastTime: this.schedulePrefs.breakfastTime + ':00',
            lunchTime: this.schedulePrefs.lunchTime + ':00',
            dinnerTime: this.schedulePrefs.dinnerTime + ':00',
            preMealOffsetMinutes: this.schedulePrefs.preMealOffsetMinutes || 15
        };

        this.medScheduleService.createSchedule(req).subscribe({
            next: (res) => {
                alert('Schedule created successfully! Timers are now active.');
                this.closeScheduleModal();
                this.loadData();
                this.checkDueDoses();
            },
            error: (err) => {
                console.error('Error creating schedule', err);
                alert('Failed to create schedule. Please check console for details.');
            }
        });
    }

    requestRenewal(prescriptionId: number | undefined): void {
        if (!prescriptionId) return;
        if (confirm('Request refill for this prescription?')) {
            this.renewalService.requestRenewal(prescriptionId).subscribe({
                next: (res) => alert('Renewal requested sent to doctor.'),
                error: (err) => alert('Failed to request renewal: ' + err.error)
            });
        }
    }

    getNextDoseTime(prescription: Prescription): string {
        if (!prescription.items || prescription.items.length === 0) return 'Pending';
        const timing = prescription.items[0].dosageTiming?.toLowerCase() || '';

        // Return actual timing string from backend if available, or parse it
        return timing ? `Scheduled: ${timing}` : 'Scheduled';
    }

    private parseDate(val: any): Date | null {
        if (!val) return null;
        if (Array.isArray(val)) {
            // [year, month, day, hour, minute]
            if (val.length >= 3) return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0);
            return null;
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }

    formatDate(val: any): string {
        const d = this.parseDate(val);
        if (!d) return 'N/A';
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getDosageProgress(prescription: Prescription): number {
        if (!prescription.items || prescription.items.length === 0) return 0;
        if (!prescription.id) return 0;

        const item = prescription.items[0];
        const startDateRaw = item.startDate || prescription.createdAt;
        const start = this.parseDate(startDateRaw);
        if (!start) return 0;

        start.setHours(0, 0, 0, 0);

        // Use endDate if available, otherwise assume 30-day course
        const endRaw = item.endDate ? this.parseDate(item.endDate) : null;
        const end = endRaw || new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // Fallback if endRaw is null
        end.setHours(23, 59, 59, 999);

        // Calculate total days for the ENTIRE course, acting as a progress bar
        let courseDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (courseDays < 1) courseDays = 1;

        const timings = item.dosageTiming ? item.dosageTiming.split(',') : ['Daily'];
        const totalCourseExpected = courseDays * timings.length;

        const logsCount = this.adherenceLogs.filter(l => l.prescription?.id === prescription.id).length;

        if (totalCourseExpected === 0) return 0;
        return Math.min(100, Math.round((logsCount / totalCourseExpected) * 100));
    }

    getAdherenceBlocks(prescription: Prescription): { date: Date, taken: boolean }[] {
        if (!prescription.items || prescription.items.length === 0 || !prescription.id) return [];
        const item = prescription.items[0];

        const startDateRaw = item.startDate || prescription.createdAt;
        const start = this.parseDate(startDateRaw);
        if (!start) return [];

        start.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Show up to the last 7 days or since start date
        const blocks = [];
        const displayStart = new Date(today);
        displayStart.setDate(today.getDate() - 6);

        const effectiveStart = start > displayStart ? start : displayStart;

        for (let d = new Date(effectiveStart); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const taken = this.adherenceLogs.some(log => {
                const logDateRaw = log.takenAt || log.createdAt;
                const logDate = this.parseDate(logDateRaw);
                return log.prescription?.id === prescription.id && logDate && logDate.toISOString().split('T')[0] === dateStr;
            });
            blocks.push({
                date: new Date(d),
                taken: taken
            });
        }
        return blocks;
    }

    getDashOffset(progress: number): number {
        const circumference = 2 * Math.PI * 55;
        return circumference - ((progress / 100) * circumference);
    }

    /** Returns "morning" / "afternoon" / "evening" based on local time */
    getGreeting(): string {
        const h = new Date().getHours();
        if (h < 12) return 'morning';
        if (h < 17) return 'afternoon';
        return 'evening';
    }

    /** Offset for overview ring  (r=62, circ≈390) */
    getAdherenceOffset(progress: number): number {
        const circ = 2 * Math.PI * 62;
        return circ - (progress / 100) * circ;
    }

    /** Offset for adherence-section ring  (r=68, circ≈427) */
    getAdherenceOffset2(progress: number): number {
        const circ = 2 * Math.PI * 68;
        return circ - (progress / 100) * circ;
    }

    downloadPdf(id: number | undefined): void {
        if (!id) return;
        this.prescriptionService.downloadPrescription(id).subscribe({
            next: (data: Blob) => {
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = `prescription-${id}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Failed to download PDF', err)
        });
    }

    viewHistory(id: number | undefined): void {
        if (!id) return;
        this.prescriptionService.getAuditHistory(id).subscribe({
            next: (data) => this.selectedHistory = data,
            error: (err) => console.error('Failed to load history', err)
        });
    }

    closeHistory(): void {
        this.selectedHistory = null;
    }

    logout(): void {
        this.authService.logout();
    }

    // ── Temporal Adherence Block Helpers ─────────────────────────────

    isToday(dateStr: string): boolean {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
    }

    formatBlockDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    formatBlockDateFull(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    selectAdherenceBlock(block: any): void {
        this.selectedBlock = this.selectedBlock?.date === block.date ? null : block;
    }

    markBlockDose(dose: any, status: string): void {
        this.doseLogService.markDose(dose.doseId, status).subscribe({
            next: (updated) => {
                dose.status = updated.status;
                // Recalculate block adherence
                if (this.selectedBlock) {
                    const takenNow = this.selectedBlock.doses.filter((d: any) => d.status === 'TAKEN').length;
                    const total = this.selectedBlock.totalDoses;
                    this.selectedBlock.takenCount = takenNow;
                    this.selectedBlock.dailyAdherence = total > 0
                        ? Math.round((takenNow * 100 / total) * 10) / 10 : 0;

                    // Also update in the main list
                    const blockInList = this.adherenceBlocks.find((b: any) => b.date === this.selectedBlock.date);
                    if (blockInList) {
                        blockInList.takenCount = takenNow;
                        blockInList.dailyAdherence = this.selectedBlock.dailyAdherence;
                    }
                }
            },
            error: () => alert('Failed to mark dose.')
        });
    }
}

