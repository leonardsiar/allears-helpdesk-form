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
  const descriptionCharCount = document.getElementById("descriptionCharCount");
  const fieldset2 = document.getElementById("fieldset2");
  const fieldset3 = document.getElementById("fieldset3");
  const form = document.getElementById('helpdeskForm');
  const formErrors = document.getElementById("formErrors");
  const clickedFAQInput = document.getElementById('clickedFAQ');
  const enableUploadsCheckbox = document.getElementById("enableUploads");
  const fileUploadContainer = document.getElementById("fileUploadContainer");
  const fileInput = document.getElementById("filepond");
  const minChars = 50; // Minimum required characters

   // Track FAQ link clicks with Google Analytics and sessionStorage
  if (linksList) {
    linksList.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && e.target.href) {
        // Google Analytics event
        if (typeof gtag === "function") {
          gtag('event', 'faq_link_click', {
            'event_category': 'Helpdesk FAQ',
            'event_label': e.target.href
          });
        }
        // Mark that this user clicked a FAQ link in this session
        sessionStorage.setItem('clickedFAQ', '1');
      }
    });
  }

  // Track form submissions and whether FAQ was clicked
  if (form) {
    form.addEventListener('submit', function () {
      if (typeof gtag === "function") {
        gtag('event', 'form_submit', {
          'event_category': 'Helpdesk',
          'event_label': sessionStorage.getItem('clickedFAQ') === '1' ? 'FAQ Clicked' : 'No FAQ Click'
        });
      }
      // Optionally clear the flag after submit
      sessionStorage.removeItem('clickedFAQ');
    });
  }

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
        html = `
          <li>
            <a href="${guide.url}" target="_blank" class="link-card">
              <strong>${linkText} ↗</strong>
            </a>
          </li>
        `;
      } else if (guide.title) {
        html = `
          <li>
            <div class="link-card non-clickable-link-card">${guide.title}</div>
          </li>
        `;
      }
      linksList.innerHTML = html;
      relevantLinksDiv.style.display = "block";

      // Checkbox logic
      if (!document.getElementById("confirmReadFAQ")) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "confirmReadFAQ";

        const label = document.createElement("label");
        label.htmlFor = "confirmReadFAQ";
        label.innerHTML = "Yes I've tried, but I still need support. <span class='required'>*</span>";

        const container = document.createElement("div");
        container.appendChild(checkbox);
        container.appendChild(label);
        linksList.appendChild(container);

        checkbox.addEventListener("change", evaluateStep1);
      }
    } else {
      fieldset2.style.display = "block"; // proceed if no FAQ
    }

    const relevantGuideInput = document.getElementById("relevantGuide");
    if (guide && (guide.url || guide.title)) {
      relevantGuideInput.value = JSON.stringify(guide);
    } else {
      relevantGuideInput.value = "";
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

  // Show/hide fieldset3 based on description input
  description.addEventListener("input", () => {
    fieldset3.style.display = description.value.trim() !== "" ? "block" : "none";
  });

  // Update character count on input
  description.addEventListener("input", () => {
    const currentLength = description.value.length;
    descriptionCharCount.textContent = `${currentLength}/${minChars} characters`;

    // Change color if minimum characters are met
    if (currentLength >= minChars) {
      descriptionCharCount.style.color = "green";
    } else {
      descriptionCharCount.style.color = "gray";
    }
  });

  // hidden input to track clicked FAQ link
  if (linksList) {
  linksList.addEventListener("click", function (e) {
    if (e.target.tagName === "A" && e.target.href) {
      // ...existing analytics code...
      if (clickedFAQInput) clickedFAQInput.value = "yes";
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Clear previous errors
    formErrors.style.display = "none";
    formErrors.innerHTML = "";

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
      });

      if (!response.ok) {
        // If the response is not OK, handle errors
        const data = await response.json();
        if (data.errors) {
          const errorList = data.errors.map(err => `<li>${err.msg}</li>`).join('');
          formErrors.innerHTML = `<ul>${errorList}</ul>`;
          formErrors.style.display = "block";
        }
        return; // Stop further execution
      }

      // If successful, redirect to the success page
      window.location.href = "/success";
    } catch (error) {
      console.error("Error submitting the form:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
  });
  
   // --- TESTING: Auto-fill form with random/sample data ---
   function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomString(len = 8) {
    return Math.random().toString(36).substring(2, 2 + len);
  }

  function randomEmail() {
    return `user${Math.floor(Math.random() * 10000)}@example.com`;
  }

  function randomSentence(wordCount = 20) {
    const words = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");
    let s = [];
    for (let i = 0; i < wordCount; i++) s.push(randomFrom(words));
    return s.join(" ") + ".";
  }

  function fillTestData() {
    userRole.value = randomFrom(["school-staff", "hq-staff", "student", "parent", "others"]);
    if (userRole.value === "others") {
      otherRoleDiv.style.display = "block";
      document.getElementById("otherRoleText").value = randomString(10);
    }
    issueType.value = randomFrom([
      "login", "create-form", "audience", "publish", "responses", "collaborators", "feature-request", "other"
    ]);
    description.value = randomSentence(20) + " " + randomSentence(20);
    document.getElementById("formName").value = "Test Form " + randomString(4);
    document.getElementById("formURL").value = "https://example.com/form/" + randomString(6);
    document.getElementById("fullName").value = "Test User " + randomString(3);
    document.getElementById("email").value = randomEmail();
    document.getElementById("contactEmail").value = randomEmail();
    document.getElementById("school").value = "Test School " + randomString(2);

    // If you want to auto-check the "Use MIMS as Contact" box randomly:
    useMimsCheckbox.checked = Math.random() > 0.5;
    if (useMimsCheckbox.checked) {
      contactEmail.value = mimsEmail.value;
    }

    // Trigger change events to update conditional fields
    userRole.dispatchEvent(new Event("change"));
    issueType.dispatchEvent(new Event("change"));
  }
  // Fill test data button
  const fillTestDataButton = document.getElementById("fillTestData");
  fillTestDataButton.addEventListener("click", (e) => {
    e.preventDefault();
    fillTestData();
  });
  }

  // Import FilePond plugins
  FilePond.registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize
  );

  // Initialize FilePond
  const pond = FilePond.create(fileInput, {
    allowMultiple: true,
    maxFileSize: "5MB",
    acceptedFileTypes: ["image/jpeg", "image/png", "video/mp4"],
    labelIdle: 'Drag & Drop your files or <span class="filepond--label-action">Browse</span>',
    labelFileTypeNotAllowed: "Invalid file type. Only JPG, PNG, and MP4 are allowed.",
    labelMaxFileSizeExceeded: "File is too large. Max size is 5MB.",
    labelMaxFileSize: "Max file size is {filesize}.",
  });

  // Toggle FilePond visibility based on checkbox
  enableUploadsCheckbox.addEventListener("change", () => {
    if (enableUploadsCheckbox.checked) {
      fileUploadContainer.style.display = "block";
    } else {
      fileUploadContainer.style.display = "none";
      pond.removeFiles(); // Clear files if the checkbox is unchecked
    }
  });
});
