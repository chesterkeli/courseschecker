// server.js
const express = require("express");
const { createPool } = require("mysql2");
const db = require("./db"); // Exports your DB connection (for saving payment info)
const { verifyPayment, compareUserData } = require("./database"); // Import helper functions from database.js
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;  // All operations will now use port 3000

// Middleware: Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------------
// MySQL Database Pools
const cutoffPool = createPool({
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

// Log connection errors for both pools
cutoffPool.on("error", (err) => {
  console.error("MySQL cutoffPool Error:", err.message, err.stack);
});
requirementsPool.on("error", (err) => {
  console.error("MySQL requirementsPool Error:", err.message, err.stack);
});

// ------------------------------------------------------------------
// API Endpoint: Get all cutoff points (courses)
app.get("/api/cutoff-points", (req, res) => {
  const query = "SELECT * FROM courses";
  cutoffPool.query(query, (err, results) => {
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

// ------------------------------------------------------------------
// API Endpoint: Get all minimum requirements
app.get("/api/minimum-requirements", (req, res) => {
  const query = "SELECT * FROM `minimum requirement`";
  requirementsPool.query(query, (err, results) => {
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

// ------------------------------------------------------------------
app.post("/api/process", async (req, res) => {
  console.log("=== /api/process endpoint hit ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const { meanGrade, clusterScores, grades } = req.body;

  if (!Array.isArray(clusterScores) || clusterScores.length === 0 || !grades) {
      console.error("Invalid request: Missing clusterScores or grades.");
      return res.status(400).json({ success: false, message: "Invalid request: Missing clusterScores or grades." });
  }

  try {
      const courses = await compareUserData({ clusterScores });

      console.log("Qualified courses found:", courses);
      res.json({ success: true, courses });
  } catch (error) {
      console.error("🔥 ERROR in /api/process:", error);  // <== ADDED this for debugging
      res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------------------------------------------------
// Function to save payment info using an inline callback
function savePaymentInfo(cutoffPoints, grades, callback) {
  const query = "INSERT INTO payments (cutoffPoints, grades) VALUES (?, ?)";
  db.query(query, [cutoffPoints, grades], (err, results) => {
    if (err) {
      console.error("Error saving payment info:", err.message, err.stack);
    } else {
      console.log("Payment info saved successfully:", results);
    }
    callback(err, results);
  });
}

// API Endpoint: Payment callback for processing payment info
app.post("/api/payment-callback", (req, res) => {
  const { cutoffPoints, grades, reference, status } = req.body;
  if (!cutoffPoints || !grades || !reference || !status) {
    console.error("Missing required payment information:", req.body);
    return res.status(400).json({ error: "Missing required payment information." });
  }
  savePaymentInfo(JSON.stringify(cutoffPoints), JSON.stringify(grades), (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Payment info could not be saved." });
    }
    res.json({ message: "Payment info saved successfully", reference, status });
  });
});

// ------------------------------------------------------------------
// API Endpoint: Process payment and compare user data to determine qualified courses
app.post("/process", async (req, res) => {
  console.log("=== /process endpoint hit ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  const { reference, userData } = req.body;
  if (!reference || !userData) {
    console.error("Missing reference or userData in request.");
    return res.status(400).json({ success: false, message: "Missing reference or userData." });
  }
  try {
    // Verify the payment using the imported verifyPayment function
    const verificationResult = await verifyPayment(reference);
    if (!verificationResult.success) {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }
    console.log("Payment verified successfully. Proceeding with course filtering...");
    const courses = await compareUserData(userData);
    console.log("Qualified courses found:", courses);
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error in /process endpoint:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Serve static files (e.g., CSS, JS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the homepage at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "courseschecker.html"));
});
// ------------------------------------------------------------------
// API Endpoint: /verify (optional) to verify payment via Paystack
app.get("/verify", async (req, res) => {
  const { reference } = req.query;
  try {
    const result = await verifyPayment(reference);
    if (result.success) {
      res.sendFile(path.join(__dirname, "confirmation.html"));
    } else {
      console.error("Payment verification failed for reference:", reference);
      res.send("Payment verification failed. Please contact support.");
    }
  } catch (error) {
    console.error("Error in /verify endpoint:", error.message, error.stack);
    res.status(500).send("An error occurred during verification.");
  }
});

// ------------------------------------------------------------------
// Webhook Endpoint: Handle Paystack notifications (optional)
app.post("/paystack/webhook", (req, res) => {
  const payload = req.body;
  verifyPayment(payload.data.reference)
    .then(result => {
      console.log("Webhook processed for reference:", payload.data.reference);
      res.status(200).send("OK");
    })
    .catch(err => {
      console.error("Error processing webhook:", err.message, err.stack);
      res.status(500).send("Error processing webhook");
    });
});

// ------------------------------------------------------------------
// Handle invalid routes (404 errors)
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ------------------------------------------------------------------
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export helper functions if needed elsewhere
module.exports = { verifyPayment, compareUserData };
