import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdherenceLog } from '../models/adherence-log.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AdherenceService {
    private apiUrl = 'http://localhost:8081/api/adherence';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    logAdherence(patientId: number, prescriptionId: number): Observable<AdherenceLog> {
        return this.http.post<AdherenceLog>(`${this.apiUrl}/log`, { patientId, prescriptionId }, { headers: this.getHeaders() });
    }

    getPatientLogs(patientId: number): Observable<AdherenceLog[]> {
        return this.http.get<AdherenceLog[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
    }

    getPatientAdherenceScore(patientId: number): Observable<{ score: number, patientId: number }> {
        return this.http.get<{ score: number, patientId: number }>(`${this.apiUrl}/patient/${patientId}/score`, { headers: this.getHeaders() });
    }

    getAdherenceTrend(patientId: number, days: number = 14): Observable<any[]> {
        return this.http.get<any[]>(`http://localhost:8081/api/analytics/schedules/patient/${patientId}/trend?days=${days}`, { headers: this.getHeaders() });
    }

    getMyAdherenceTrend(days: number = 14): Observable<any[]> {
        return this.http.get<any[]>(`http://localhost:8081/api/analytics/schedules/my-trend?days=${days}`, { headers: this.getHeaders() });
    }
}
