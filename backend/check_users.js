const mysql = require('mysql2/promise');

async function checkUsers() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'med_system'
        });

        const [rows] = await connection.execute('SELECT id, email, role, is_verified FROM users');
        console.log('--- USER STATUS ---');
        rows.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Verified: ${u.is_verified === 1}`);
        });
        console.log('-------------------');
        await connection.end();
    } catch (err) {
        console.error('Error connecting to MySQL:', err.message);
    }
}

checkUsers();
