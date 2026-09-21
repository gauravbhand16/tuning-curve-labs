(() => {
  "use strict";

  const nav = document.querySelector(".nav");
  const menu = document.querySelector(".menu");
  const modal = document.getElementById("leadModal");
  const leadForm = document.getElementById("leadForm");
  const formStatus = document.getElementById("formStatus");

  const setMenuState = (open) => {
    if (!nav || !menu) return;
    nav.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  };

  menu?.setAttribute("aria-expanded", "false");
  menu?.addEventListener("click", () => {
    setMenuState(!nav?.classList.contains("open"));
  });

  document.querySelectorAll(".nav a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  const openModal = () => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      document.getElementById("leadName")?.focus();
    }, 30);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  document.querySelectorAll(".open-lead-modal").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setMenuState(false);
      openModal();
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((trigger) => {
    trigger.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) {
      closeModal();
    }
  });

  if (!leadForm || !formStatus) return;

  let submitting = false;

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    const submitButton = leadForm.querySelector('button[type="submit"]');
    const formData = new FormData(leadForm);

    const name = String(formData.get("Name") || "").trim();
    const email = String(formData.get("Email") || "").trim();
    const country = String(formData.get("Country") || "").trim();
    const details = String(formData.get("Details") || "").trim();

    formStatus.textContent = "";
    formStatus.className = "form-status";

    if (!name || !email || !country || !details) {
      formStatus.textContent = "Please complete Name, Email, Country and Details.";
      formStatus.className = "form-status error";
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formStatus.textContent = "Please enter a valid email address.";
      formStatus.className = "form-status error";
      return;
    }

    const payload = Object.fromEntries(formData.entries());

    submitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent || "Send enquiry →";
      submitButton.textContent = "SENDING...";
    }
    formStatus.textContent = "Sending...";
    formStatus.className = "form-status";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let result = {};
      try {
        result = await response.json();
      } catch (_) {
        result = {};
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
          "We could not send your enquiry right now. Please email support@tuningcurvelabs.com."
        );
      }

      formStatus.textContent =
        result.message || "Thanks. Your enquiry has been sent.";
      formStatus.className = "form-status success";
      leadForm.reset();
    } catch (error) {
      formStatus.textContent =
        error?.message ||
        "We could not send your enquiry right now. Please email support@tuningcurvelabs.com.";
      formStatus.className = "form-status error";
    } finally {
      submitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          submitButton.dataset.originalText || "Send enquiry →";
      }
    }
  });
})();
