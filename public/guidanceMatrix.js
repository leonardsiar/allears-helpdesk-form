const faqDetails = {
  login: {
    url: "https://allears.estl.edu.sg/faqs#h.ryhumy7aab84",
    title: 'Frequently asked questions about login/access'
  },
  "create-form": {
    url: "https://allears.estl.edu.sg/faqs#h.6efeqyn7u97j",
    title: 'Frequently asked questions about creating a form'
  },
  audience: {
    url: "https://allears.estl.edu.sg/faqs#h.gzyspnl9pnqf",
    title: 'Frequently asked questions about managing audience'
  },
  publish: {
    url: "https://allears.estl.edu.sg/faqs#h.xy36wnjb82us",
    title: 'Frequently asked questions about publishing a form'
  },
  responses: {
    url: "https://allears.estl.edu.sg/faqs#h.bibpeqh67til",
    title: 'Frequently asked questions about managing responses'
  },
  collaborators: {
    url: "https://allears.estl.edu.sg/faqs#h.tgk70eexxa5t",
    title: 'Frequently asked questions about managing collaborators'
  }
};

const guidanceMatrix = {
  "school-staff": {
    login: faqDetails.login,
    "create-form": faqDetails["create-form"],
    audience: faqDetails.audience,
    publish: faqDetails.publish,
    responses: faqDetails.responses,
    collaborators: faqDetails.collaborators,
    "feature-request": { url: "", title: "" },
    other: { url: "", title: "" }
  },
  "hq-staff": {
    login: faqDetails.login,
    "create-form": faqDetails["create-form"],
    audience: faqDetails.audience,
    publish: faqDetails.publish,
    responses: faqDetails.responses,
    collaborators: faqDetails.collaborators,
    "feature-request": { url: "", title: "" },
    other: { url: "", title: "" }
  },
  student: {
    login: { url: "", title: "🔔 Students: Please contact your school’s Local MIMS administrator first." },
    "create-form": { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    audience: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    publish: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    responses: faqDetails.responses,
    collaborators: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    "feature-request": { url: "", title: "" },
    other: { url: "", title: "" }
  },
  parent: {
    login: { url: "", title: "👨‍👧 Parents: Please reach out to your child’s form teacher for support." },
    "create-form": { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    audience: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    publish: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    responses: faqDetails.responses,
    collaborators: { url: "", title: "🚫 Form creation is only available to school staff at the moment." },
    "feature-request": { url: "", title: "" },
    other: { url: "", title: "" }
  },
  others: {
    login: faqDetails.login,
    "create-form": faqDetails["create-form"],
    audience: faqDetails.audience,
    publish: faqDetails.publish,
    responses: faqDetails.responses,
    collaborators: faqDetails.collaborators,
    "feature-request": { url: "", title: "" },
    other: { url: "", title: "" }
  },
};