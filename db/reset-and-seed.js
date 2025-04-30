// db/reset-and-seed.js
const { db, resetDatabase } = require('./database');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting database reset and seed process...');

// First reset the database
const resetResult = resetDatabase();

if (resetResult) {
  console.log('Database reset successful. Running seed script...');
  
  // Run the seed script
  const seedScript = path.join(__dirname, 'sample-data.js');
  exec(`node ${seedScript}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing seed script: ${error}`);
      return;
    }
    
    if (stderr) {
      console.error(`Seed script stderr: ${stderr}`);
    }
    
    console.log(stdout);
    console.log('Database reset and seed process completed successfully!');
  });
} else {
  console.error('Database reset failed. Aborting seed process.');
}