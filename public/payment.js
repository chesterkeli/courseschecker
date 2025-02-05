const paymentForm = document.getElementById('paymentForm');
paymentForm.addEventListener("submit", payWithPaystack, false);

function payWithPaystack(e) {
  e.preventDefault();

  let handler = PaystackPop.setup({
    key: 'pk_test_dd0e7f3ab0f5858e1ec8bc09297a9b240917f595',
    email: document.getElementById("email-address").value,
    amount: 200 * 100,  // Fixed amount: 200 KES (converted to kobo by multiplying by 100)
    currency: 'KES',
    ref: '' + Math.floor((Math.random() * 1000000000) + 1),
    onClose: function () {
      alert('Payment window closed.');
    },
    callback: function (response) {
      alert('Payment complete! Reference: ' + response.reference);

      // ✅ 1. Get user data from localStorage
      const userDataStr = localStorage.getItem('userData');
      if (!userDataStr) {
        console.error("❌ Missing localStorage data: userData");
        alert("Error: Missing required data.");
        return;
      }

      let parsedUserData;
      try {
        parsedUserData = JSON.parse(userDataStr);
      } catch (error) {
        console.error("❌ Error parsing JSON data:", error);
        alert("Error processing stored data.");
        return;
      }

      // ✅ 2. Rename `clusters` to `clusterScores`
      let clusterScores = parsedUserData.clusters || [];
      if (!Array.isArray(clusterScores) || clusterScores.length !== 20) {
        console.error("❌ Invalid clusterScores data. Expected 20 values:", clusterScores);
        alert("Error: Cluster scores data is invalid.");
        return;
      }

      // ✅ 3. Ensure `grades` is valid
      const grades = parsedUserData.grades;
      if (!grades || typeof grades !== "object" || Object.keys(grades).length === 0) {
        console.error("❌ Invalid grades format. Expected an object:", grades);
        alert("Error: Grades data is invalid.");
        return;
      }

      // ✅ 4. Ensure `meanGrade` exists
      const meanGrade = parsedUserData.meanGrade || "N/A";

      // ✅ 5. Correct payload structure
      const payload = {
        meanGrade: meanGrade,
        clusterScores: clusterScores, // Corrected name
        grades: grades
      };

      console.log("📤 Sending parsed user data to server:", payload);

      fetch("http://localhost:5000/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(response => response.json())
        .then(data => {
          console.log("📥 Server response:", data);
          if (data.success) {
            localStorage.setItem('eligibleCourses', JSON.stringify(data.courses));
            window.location.href = "results.html";
          } else {
            console.error("❌ Server processing error:", data.message);
            alert("Processing error: " + data.message);
          }
        })
        .catch(error => {
          console.error("❌ Network error:", error);
          alert("An unexpected error occurred. Please try again.");
        });
    }
  });

  console.log("🟢 Opening Paystack iframe...");
  handler.openIframe();
}
