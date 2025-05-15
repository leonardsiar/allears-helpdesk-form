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

    // If issue is "feature-request" or "other", skip FAQ/checkbox and show fieldset2 after delay
    if (issue === "feature-request" || issue === "other") {
      setTimeout(() => {
        fieldset2.style.display = "block";
      }, 500); // 500ms delay
      return;
    }

    const guide = guidanceMatrix[role]?.[issue];
    if (guide) {
      let html = "";
      if (guide.url) {
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
        label.innerHTML = "Yes, I've read the FAQ/guide, but still need support. <span class='required'>*</span>";

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
      const response = await fetch('https://allears-helpdesk-form.onrender.com/submit', {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) {
        // Try to parse JSON error response
        let errorMsg = "An unknown error occurred.";
        try {
          const data = await response.json();
          if (data.errors && Array.isArray(data.errors)) {
            errorMsg = "<ul>" + data.errors.map(e => `<li>${e.msg}</li>`).join('') + "</ul>";
          }
        } catch {
          // fallback to HTML extraction if not JSON
          const html = await response.text();
          const match = html.match(/<ul>([\s\S]*?)<\/ul>/);
          if (match) errorMsg = `<ul>${match[1]}</ul>`;
        }
        errorDiv.innerHTML = errorMsg;
      } else {
        form.reset();
        errorDiv.style.color = "green";
        errorDiv.innerHTML = "🎉 Your request has been submitted successfully! Check your inbox for confirmation.";
      }
    } catch (err) {
      errorDiv.textContent = "Network error. Please try again.";
    }
  });
});
