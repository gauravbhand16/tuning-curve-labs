import nodemailer from "nodemailer";

const clean = (value, max = 5000) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email);

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      message: "Method not allowed."
    });
  }

  try {
    let body = req.body || {};

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      body = {};
    }

    if (JSON.stringify(body).length > 20000) {
      return res.status(413).json({
        ok: false,
        message: "That message is too long. Please shorten it and try again."
      });
    }

    if (clean(body.website, 200)) {
      return res.status(200).json({
        ok: true,
        message: "Thanks, your enquiry has been sent."
      });
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

    if (countryCode && !/^\+\d{1,4}$/.test(countryCode)) {
      return res.status(400).json({
        ok: false,
        message: "Please choose a valid phone country code."
      });
    }

    if (
      phone &&
      (!/^[\d\s()+.-]+$/.test(phone) ||
        phone.replace(/\D/g, "").length < 7 ||
        phone.replace(/\D/g, "").length > 15)
    ) {
      return res.status(400).json({
        ok: false,
        message: "Please enter a valid phone number."
      });
    }

    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
      console.error("Missing SMTP environment variables:", missing.join(", "));
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
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    const toEmail =
      process.env.CONTACT_TO_EMAIL || "support@tuningcurvelabs.com";

    const fromEmail =
      process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

    const message = [
      "New website enquiry",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Country: ${country}`,
      `Phone: ${phone ? `${countryCode} ${phone}`.trim() : "Not provided"}`,
      "",
      "Details:",
      details
    ].join("\n");

    await transporter.sendMail({
      from: `"Tuning Curve Labs Website" <${fromEmail}>`,
      to: toEmail,
      replyTo: { name, address: email },
      subject: `New website enquiry from ${name}`,
      text: message
    });

    return res.status(200).json({
      ok: true,
      message: "Thanks, your enquiry has been sent."
    });

  } catch (error) {
    console.error("Contact form error:", error);

    return res.status(500).json({
      ok: false,
      message: "We could not send your enquiry right now. Your details are still here, so please try again, or email support@tuningcurvelabs.com."
    });
  }
}
