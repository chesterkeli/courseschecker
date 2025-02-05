/**
 * db.js
 *
 * This file sets up MySQL connection pools for two databases:
 * - coursesdb: Contains your courses and cutoff points.
 * - minimumrequirementsdb: Contains your minimum requirements data.
 *
 * It tests the connections upon startup and exports both pools for use in your application.
 */

const mysql = require("mysql2");

// Create a connection pool for the "coursesdb" database.
const coursesPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "@Chesterkeli254",
  database: "coursesdb",
  connectionLimit: 100,
});

// Create a connection pool for the "minimumrequirementsdb" database.
const requirementsPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "@Chesterkeli254",
  database: "minimumrequirementsdb",
  connectionLimit: 100,
});

// Test the connection for coursesPool.
coursesPool.getConnection((err, connection) => {
  if (err) {
    console.error("Courses database connection failed:", err);
  } else {
    console.log("Connected to the courses database via pool.");
    connection.release();
  }
});

// Test the connection for requirementsPool.
requirementsPool.getConnection((err, connection) => {
  if (err) {
    console.error("Minimum requirements database connection failed:", err);
  } else {
    console.log("Connected to the minimum requirements database via pool.");
    connection.release();
  }
});

// Export both pools for use elsewhere in your application.
module.exports = { coursesPool, requirementsPool };
