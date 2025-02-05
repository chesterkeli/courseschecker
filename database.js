// database.js
const express = require("express");
const { createPool } = require("mysql2");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MySQL Connection Pools ---
const coursesPool = createPool({
  host: "localhost",
  user: "root",
  password: "@Chesterkeli254",
  database: "coursesdb",
  connectionLimit: 100,
});

const requirementsPool = createPool({
  host: "localhost",
  user: "root",
  password: "@Chesterkeli254",
  database: "minimumrequirementsdb",
  connectionLimit: 100,
});

// Log pool connection errors
coursesPool.on("error", (err) => {
  console.error("MySQL coursesPool Error:", err.message, err.stack);
});
requirementsPool.on("error", (err) => {
  console.error("MySQL requirementsPool Error:", err.message, err.stack);
});

async function compareUserData(userData) {
  return new Promise((resolve, reject) => {
    const { clusterScores } = userData;

    if (!Array.isArray(clusterScores) || clusterScores.length === 0) {
      return reject(new Error("Invalid user data: missing clusterScores."));
    }

    // Get the highest cluster score
    const highestScore = Math.max(...clusterScores);

    const query = `
      SELECT \`PROG CODE\`, \`INSTITUTION NAME\`, \`PROGRAMME NAME\`, \`2023 CUTOFF\`
      FROM courses
      WHERE \`2023 CUTOFF\` <= ?
    `;

    coursesPool.query(query, [highestScore], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

// --- Endpoints ---

// GET /api/cutoff-points
app.get("/api/cutoff-points", (req, res) => {
  coursesPool.query("SELECT * FROM courses", (err, results) => {
    if (err) {
      console.error("Error querying cutoff points:", err.message, err.stack);
      return res.status(500).json({
        message: "Something went wrong! Please try again later.",
        error: err.message,
      });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No cutoff points found." });
    }
    res.status(200).json({ cutoffPoints: results });
  });
});

// GET /api/minimum-requirements
app.get("/api/minimum-requirements", (req, res) => {
  requirementsPool.query("SELECT * FROM `minimum requirement`", (err, results) => {
    if (err) {
      console.error("Error querying minimum requirements:", err.message, err.stack);
      return res.status(500).json({
        message: "Something went wrong! Please try again later.",
        error: err.message,
      });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No minimum requirements found." });
    }
    res.status(200).json({ minimumRequirements: results });
  });
});

// POST /process
// Expects a JSON body with { reference, userData }
// Processes the user data and returns qualified courses.
app.post("/process", async (req, res) => {
  console.log("=== /process endpoint hit ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  const { reference, userData } = req.body;
  if (!reference || !userData) {
    console.error("Missing reference or userData in request.");
    return res
      .status(400)
      .json({ success: false, message: "Missing reference or userData." });
  }
  try {
    // Directly process the userData without payment verification
    console.log("Processing user data for course filtering...");
    const courses = await compareUserData(userData);
    console.log("Qualified courses found:", courses);
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error in /process endpoint:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// POST /api/filter-courses
// Expects a JSON body with { reference, userData }
{
  { message: "Route /api/process not found." }
}
// 404 Handler for invalid routes
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found.`,
  });
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Export helper functions for use elsewhere if needed
module.exports = { compareUserData };
