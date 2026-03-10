import java.sql.*;

public class DebugPrescriptions {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/med_system", "root", "root");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT p.id, p.status, p.pharmacist_id, p.dispensed_at, i.medicine_name FROM prescriptions p LEFT JOIN prescription_item i ON p.id = i.prescription_id WHERE p.status = 'DISPENSED'");
            while (rs.next()) {
                System.out.println("Rx ID: " + rs.getLong("id") +
                        ", Status: " + rs.getString("status") +
                        ", Pharmacist ID: " + rs.getLong("pharmacist_id") +
                        ", Dispensed: " + rs.getString("dispensed_at") +
                        ", Item: " + rs.getString("medicine_name"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
