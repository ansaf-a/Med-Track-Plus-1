# MedTrack Plus: Clinical Fulfillment & Adherence Ecosystem

MedTrack Plus is a professional, role-based healthcare platform designed to bridge the gap between clinical prescriptions and daily patient adherence. It ensures a secure, "Closed-Loop" handshake between Doctors, Pharmacists, and Patients.

---

## 🌟 Core High-Integrity Features

### 🛡️ Audit Vault (v1.0 → v1.1)
Every modification to a prescription triggers a JSON snapshot and a version increment for legal compliance. The system tracks:
- **Clinical Deltas**: Automatic detection of changes in Medicine Name, Dosage, or Duration.
- **Identity Resolution**: Clearly identifies the Prescribing Doctor and Dispensing Pharmacist for every version.
- **Tamper-Proof Logs**: Immutable audit trail stored in the `prescription_audits` table.

### 🍱 Nutritional Synchronization
Doctors can lock clinical constraints (Before/After/With Food) for specific meal slots:
- **Precision Slots**: BREAKFAST, LUNCH, and DINNER synchronization.
- **Patient Personalization**: Patients set their own meal times, and the system auto-adjusts medication reminders based on clinical offsets (e.g., 30 mins before breakfast).

### 🚀 Directed Dispatch
A secure, targeted routing system between verified Doctors and Pharmacists:
- **Validation & Signing**: Doctors digitally sign prescriptions before they become active.
- **Pharmacist Workflow**: Real-time queue for pharmacists to verify, dispense, and log fulfillment.

### 📊 Adherence Risk Engine
Real-time monitoring of patient compliance:
- **Visual Gauges**: Apollo-style Circular Progress Gauges.
- **Risk Flagging**: Patients with adherence below **70%** are automatically flagged as "High Risk" for clinical intervention.
- **Analytics**: Historical adherence trends and "Adherence Blocks" for granular tracking.

### 🔔 Event-Driven Notifications
Interactive reminder system:
- **Smart Reminders**: Notifications triggered based on personalized meal schedules.
- **Actionable Alerts**: Support for "Mark as Taken", "Snooze" (15 min), and "Missed" logging.
- **Clinical Alerts**: Stock alerts for pharmacists and system-level anomalies.

---

## 🏗️ Technical Architecture

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Angular 17+ | Apollo Glassmorphic UI, RxJS state management, Real-time dashboards. |
| **Backend** | Spring Boot 3 | JWT Security, JPA Entity Listeners for Auditing, Task Scheduling. |
| **Database** | MySQL 8 | Relational storage for prescriptions, audits, and user roles. |
| **Security** | Spring Security | Role-Based Access Control (RBAC), Digital Signatures. |

---

## 🚀 Quick Start

### Backend Setup
1. Navegate to the `backend` directory.
2. Configure `src/main/resources/application.properties` with your MySQL credentials.
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The backend will start at `http://localhost:8081`.*

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the dashboard:
   ```bash
   npm start
   ```
   *Access the Apollo Dashboard at `http://localhost:4200`.*

### Governance
- **Admin**: Log in to verify Doctor/Pharmacist licenses.
- **Doctor**: Issue and digitally sign prescriptions.
- **Pharmacist**: Dispense medications and manage inventory.
- **Patient**: Configure meal times and track daily adherence.

---

## 📁 Project Structure

- `backend/`: Spring Boot application.
- `frontend/`: Angular application.
- `uploads/`: Storage for PDF prescriptions and digital signatures.
