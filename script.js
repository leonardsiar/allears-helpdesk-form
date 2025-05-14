// Wait until the page is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  const userRole = document.getElementById("userRole");
  const otherRoleDiv = document.getElementById("otherRoleDiv");
  const useMimsCheckbox = document.getElementById("useMimsAsContact");
  const mimsEmail = document.getElementById("email");
  const contactEmail = document.getElementById("contactEmail");
  const issueType = document.getElementById("issueType");
  const relevantLinksDiv = document.getElementById("relevantLinks");
  const linksList = document.getElementById("linksList");

  // Show/hide 'Describe your role' when 'Others' is selected
  userRole.addEventListener("change", function () {
    if (userRole.value === "others") {
      otherRoleDiv.style.display = "block";
    } else {
      otherRoleDiv.style.display = "none";
    }
  });

  // Auto-fill contact email with MIMS ID if checkbox is ticked
  useMimsCheckbox.addEventListener("change", function () {
    if (useMimsCheckbox.checked) {
      contactEmail.value = mimsEmail.value;
    } else {
      contactEmail.value = "";
    }
  });

  // Show relevant FAQ based on user role + issue type
  issueType.addEventListener("change", function () {
    const role = userRole.value;
    const issue = issueType.value;
    linksList.innerHTML = ""; // Clear existing links
    relevantLinksDiv.style.display = "none"; // Hide by default

    if (role === "student" && issue === "login") {
      linksList.innerHTML = "<li>🔔 Students: Please contact your school’s Local MIMS administrator first. </li>";
      relevantLinksDiv.style.display = "block";
    } else if (role === "parent" && issue === "login") {
      linksList.innerHTML = "<li>👨‍👧 Parents: Please reach out to your child’s form teacher for support.</li>";
      relevantLinksDiv.style.display = "block";
    } else if (role === "student" && issue === "create-form") {
      linksList.innerHTML = "<li>🚫 Form creation is only available to school staff at the moment.</li>";
      relevantLinksDiv.style.display = "block";
    } else if (issue === "access-form" || issue === "responses") {
      linksList.innerHTML = "<li>💡 This guide might help solve your issue: <a href='#'>Troubleshooting Form Access</a></li>";
      relevantLinksDiv.style.display = "block";
    }
  });
});