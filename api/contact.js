const nodemailer = require("nodemailer");

function clean(value, max = 5000) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }

    if (clean(body.website, 200)) {
      return res.status(200).json({ ok: true, message: "Thanks. Your enquiry has been sent." });
    }

    const name = clean(body.Name, 150);
    const email = clean(body.Email, 254);
    const country = clean(body.Country, 120);
    const details = clean(body.Details, 5000);
    const countryCode = clean(body.CountryCode, 12);
    const phone = clean(body.Phone, 60);

    if (!name || !email || !country || !details) {
      return res.status(400).json({
        ok: false,
        message: "Please complete Name, Email, Country and Details."
      });
    }

    if (!validEmail(email)) {
      return res.status(400).json({
        ok: false,
        message: "Please enter a valid email address."
      });
    }

    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
      console.error("Missing SMTP env vars:", missing.join(", "));
      return res.status(500).json({
        ok: false,
        message: "The form is temporarily unavailable. Please email support@tuningcurvelabs.com."
      });
    }

    const port = Number(process.env.SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const fullPhone = phone ? `${countryCode} ${phone}`.trim() : "Not provided";
    const toEmail = process.env.CONTACT_TO_EMAIL || "support@tuningcurvelabs.com";
    const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

    const message = [
      "New website enquiry",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Country: ${country}`,
      `Phone: ${fullPhone}`,
      "",
      "Details:",
      details
    ].join("\n");

    await transporter.sendMail({
      from: `"Tuning Curve Labs Website" <${fromEmail}>`,
      to: toEmail,
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text: message
    });

    return res.status(200).json({
      ok: true,
      message: "Thanks. Your enquiry has been sent."
    });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({
      ok: false,
      message: "We could not send your enquiry right now. Please email support@tuningcurvelabs.com."
    });
  }
};
