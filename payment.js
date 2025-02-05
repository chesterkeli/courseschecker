const paymentForm = document.getElementById('paymentForm');
paymentForm.addEventListener("submit", payWithPaystack, false);

function payWithPaystack(e) {
  e.preventDefault();

  let handler = PaystackPop.setup({
    key: 'pk_test_dd0e7f3ab0f5858e1ec8bc09297a9b240917f595',
    email: document.getElementById("email-address").value,
    amount: document.getElementById("amount").value * 100,
    currency: 'KES',
    ref: '' + Math.floor((Math.random() * 1000000000) + 1),
    onClose: function () {
      alert('Payment window closed.');
    },
    callback: function (response) {
      alert('Payment complete! Reference: ' + response.reference);

      const userDataStr = localStorage.getItem('userData');
      if (!userDataStr) {
        console.error("Missing localStorage data: userData");
        alert("Error: Missing required data.");
        return;
      }

      let parsedUserData;
      try {
        parsedUserData = JSON.parse(userDataStr);
      } catch (error) {
        console.error("Error parsing JSON data:", error);
        alert("Error processing stored data.");
        return;
      }

      const parsedGrades = parsedUserData.grades || {};
      const parsedClusters = parsedUserData.clusters || [];

      if (!Array.isArray(parsedClusters) || parsedClusters.length !== 20) {
        console.error("Invalid clusters data. Expected 20 values:", parsedClusters);
        alert("Error: Clusters data is invalid.");
        return;
      }

      if (typeof parsedGrades !== "object" || Array.isArray(parsedGrades)) {
        console.error("Invalid grades format. Expected an object:", parsedGrades);
        alert("Error: Grades data is invalid.");
        return;
      }

      console.log("Sending parsed user data to server:", parsedUserData);

      fetch("http://localhost:5000/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedUserData)
      })
        .then(response => response.json())
        .then(data => {
          console.log("Parsed JSON from /api/process response:", data);
          if (data.success) {
            localStorage.setItem('eligibleCourses', JSON.stringify(data.courses));
            window.location.href = "results.html";
          } else {
            console.error("Processing error from server:", data.message);
            alert("Processing error: " + data.message);
          }
        })
        .catch(error => {
          console.error("Network error:", error);
          if (error instanceof TypeError) {
            alert("Network connection error. Please check your internet connection.");
          } else {
            alert("An unexpected error occurred. Please try again.");
          }
        });
    }
  });

  console.log("Opening Paystack iframe...");
  handler.openIframe();
}
