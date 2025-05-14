document.addEventListener("DOMContentLoaded", function () {
  const userRole = document.getElementById("userRole");
  const otherRoleDiv = document.getElementById("otherRoleDiv");
  const useMimsCheckbox = document.getElementById("useMimsAsContact");
  const mimsEmail = document.getElementById("email");
  const contactEmail = document.getElementById("contactEmail");
  const issueType = document.getElementById("issueType");
  const relevantLinksDiv = document.getElementById("relevantLinks");
  const linksList = document.getElementById("linksList");
  const description = document.getElementById("description");
  const fieldset2 = document.getElementById("fieldset2");
  const fieldset3 = document.getElementById("fieldset3");
  const form = document.getElementById('helpdeskForm');
  const errorDiv = document.getElementById('formErrors');

  // Show/hide "Describe your role" field
  userRole.addEventListener("change", () => {
    otherRoleDiv.style.display = userRole.value === "others" ? "block" : "none";
    updateGuidanceAndEvaluate();
  });

  // Auto-fill contact email using MIMS ID
  useMimsCheckbox.addEventListener("change", () => {
    contactEmail.value = useMimsCheckbox.checked ? mimsEmail.value : "";
  });

  issueType.addEventListener("change", updateGuidanceAndEvaluate);

  function updateGuidanceAndEvaluate() {
    const role = userRole.value;
    const issue = issueType.value;
    linksList.innerHTML = "";
    relevantLinksDiv.style.display = "none";
    fieldset2.style.display = "none";

    if (!role || !issue) return;

    const guide = guidanceMatrix[role]?.[issue];
    if (guide) {
      let html = "";
      if (guide.url) {
        // Extract the keyword from the title (e.g., "login" from 'Frequently asked questions about "login"')
        let linkText = guide.title.match(/"([^"]+)"/);
        linkText = linkText ? linkText[1] : guide.title;
        html = `<li>
          <a href="${guide.url}" target="_blank"><strong>${linkText}</strong></a>
        </li>`;
      } else if (guide.title) {
        html = `<li>${guide.title}</li>`;
      }
      linksList.innerHTML = html;
      relevantLinksDiv.style.display = "block";

      if (!document.getElementById("confirmReadFAQ")) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "confirmReadFAQ";

        const label = document.createElement("label");
        label.htmlFor = "confirmReadFAQ";
        label.textContent = "Yes, I've read the FAQ/guide, but still need support.";

        const container = document.createElement("div");
        container.appendChild(checkbox);
        container.appendChild(label);
        linksList.appendChild(container);

        checkbox.addEventListener("change", evaluateStep1);
      }
    } else {
      fieldset2.style.display = "block"; // proceed if no FAQ
    }

    evaluateStep1();
  }

  function evaluateStep1() {
    const role = userRole.value;
    const issue = issueType.value;
    const faqVisible = relevantLinksDiv.style.display === "block";
    const faqCheckbox = document.getElementById("confirmReadFAQ");

    const canShow = role && issue && (!faqVisible || (faqCheckbox && faqCheckbox.checked));
    fieldset2.style.display = canShow ? "block" : "none";
  }

  // Show fieldset 3 when a screenshot is uploaded
const screenshotInput = document.getElementById("screenshot");
screenshotInput.addEventListener("change", () => {
  fieldset3.style.display = screenshotInput.files.length > 0 ? "block" : "none";
});

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.innerHTML = ""; // Clear previous errors

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const html = await response.text();
        // Try to extract errors from the HTML response
        const match = html.match(/<ul>([\s\S]*?)<\/ul>/);
        if (match) {
          errorDiv.innerHTML = `<ul>${match[1]}</ul>`;
        } else {
          errorDiv.textContent = "An unknown error occurred.";
        }
      } else {
        // On success, show a message or redirect
        form.reset();
        errorDiv.style.color = "green";
        errorDiv.innerHTML = "🎉 Your request has been submitted successfully! Check your inbox for confirmation.";
      }
    } catch (err) {
      errorDiv.textContent = "Network error. Please try again.";
    }
  });
  const fs = require('fs');
fs.writeFileSync('email-preview.html', htmlBody);
});
