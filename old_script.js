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

  // Show relevant links based on user role and issue type
  function updateRelevantLinks() {
    const role = userRole.value;
    const issue = issueType.value;
    linksList.innerHTML = ""; // Clear current message
    relevantLinksDiv.style.display = "none"; // Hide block by default

    if (!role || !issue) return; // Skip if fields aren't selected

    const message = guidanceMatrix[role]?.[issue];

    if (message) {
      // If message is a URL, wrap it in a link
      if (message.startsWith("http")) {
        linksList.innerHTML = `<li>💡 This guide might help solve your issue: <a href="${message}" target="_blank">View Guide</a></li>`;
      } else {
        linksList.innerHTML = `<li>${message}</li>`;
      }

      relevantLinksDiv.style.display = "block";

      // Dynamically add confirmation checkbox
      if (!document.getElementById("confirmReadFAQ")) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "confirmReadFAQ";

        const label = document.createElement("label");
        label.htmlFor = "confirmReadFAQ";
        label.innerText = "Yes, I've read the FAQ/guide, but still need support.";

        const wrapper = document.createElement("div");
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        linksList.appendChild(wrapper);

        checkbox.addEventListener("change", checkStep1); // So fieldset2 logic still works
      }
    } else {
      document.getElementById("fieldset2").style.display = "block"; // If no guidance needed, just proceed
    }
  }

  // Call this on both dropdowns:
  userRole.addEventListener("change", updateRelevantLinks);
  issueType.addEventListener("change", updateRelevantLinks);

  // Show fieldset2 when role and issue are selected
  userRole.addEventListener("change", checkStep1);
  issueType.addEventListener("change", checkStep1);

  function checkStep1() {
    const roleSelected = userRole.value !== "";
    const issueSelected = issueType.value !== "";
    const faqIsVisible = relevantLinksDiv.style.display === "block";
    const faqCheckbox = document.getElementById("confirmReadFAQ");

    // If both role and issue are selected
    if (roleSelected && issueSelected) {
      if (faqIsVisible) {
        // Only move on if checkbox is ticked
        if (faqCheckbox.checked) {
          document.getElementById("fieldset2").style.display = "block";
        } else {
          document.getElementById("fieldset2").style.display = "none";
        }
      } else {
        // No FAQ, proceed immediately
        document.getElementById("fieldset2").style.display = "block";
      }
    } else {
      document.getElementById("fieldset2").style.display = "none";
    }
  }
  // Re-run step 1 logic if the FAQ checkbox is changed
  const faqCheckbox = document.getElementById("confirmReadFAQ");
  if (faqCheckbox) {
    faqCheckbox.addEventListener("change", checkStep1);
  }
  

  // Show fieldset3 when issue description is filled
  const description = document.getElementById("description");

  description.addEventListener("input", function () {
    if (description.value.trim().length > 10) {
      document.getElementById("fieldset3").style.display = "block";
    }
  });
});