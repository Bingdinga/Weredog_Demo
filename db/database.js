const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, '../ecommerce.db'), { verbose: console.log });

// Check if database needs initialization
const initializeDatabase = () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  
  if (tables.length === 0) {
    console.log('Initializing database...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    db.exec('BEGIN TRANSACTION');
    try {
      statements.forEach(statement => {
        if (statement.trim()) {
          db.exec(statement);
        }
      });
      db.exec('COMMIT');
      console.log('Database initialized successfully!');
      
      // Create an admin user
      createAdminUser();
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('Error initializing database:', error);
    }
  }
};

// Create an admin user for testing
const createAdminUser = () => {
  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync('admin123', saltRounds);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run('admin', 'admin@example.com', passwordHash, 'Admin', 'User', 'admin');
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Initialize the database
initializeDatabase();

module.exports = db;
