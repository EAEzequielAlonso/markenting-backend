const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Salvoportuamor.0@localhost:5432/postgres",
});

client.connect()
    .then(() => {
        console.log('Connected to postgres database successfully!');
        return client.query('SELECT datname FROM pg_database WHERE datname = \'marketing_db\';');
    })
    .then(res => {
        if (res.rows.length > 0) {
            console.log('Database marketing_db exists.');
        } else {
            console.log('Database marketing_db does NOT exist.');
        }
        return client.end();
    })
    .catch(err => {
        console.error('Connection error', err.stack);
        process.exit(1);
    });
