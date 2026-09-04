# Tuning Curve Labs Website V13

GitHub + Vercel ready.

## Included
- Static responsive website
- Team section after Verification
- Latest social icon links
- Country field
- Phone country code selector
- All Get a Free Leak Read buttons open the same form
- Fix the Leak artwork area opens the same form
- Vercel serverless contact API
- SMTP email delivery to support@tuningcurvelabs.com

## GitHub
Push the complete contents of this folder to one GitHub repository.

## Vercel
Import the GitHub repository into Vercel.

Framework Preset: Other
Build Command: leave empty
Output Directory: leave empty

## Required Vercel Environment Variables

SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS

Optional:
CONTACT_TO_EMAIL=support@tuningcurvelabs.com
CONTACT_FROM_EMAIL=support@tuningcurvelabs.com

Use the SMTP credentials of the email provider hosting support@tuningcurvelabs.com.

Do not commit passwords or SMTP credentials to GitHub.

## Domain
After the temporary Vercel URL works:
Project Settings -> Domains -> add tuningcurvelabs.com

Vercel will show the exact DNS records to add in GoDaddy. You do not need to transfer the domain.

## Form test
After SMTP variables are configured:
1. Open the live Vercel website.
2. Submit the enquiry form.
3. Confirm the mail arrives at support@tuningcurvelabs.com.
4. Reply to the received enquiry and verify Reply-To goes to the visitor's email.


## V14 correction
- Incorrect baked-in logo block in the Losing Customers artwork is hidden.
- No replacement logo overlay is used.
- FIX THE LEAK remains clickable and opens the enquiry popup.

## V15 updates
- Browser tab favicon added using the official Tuning Curve Labs logo.
- Team photo replaced with the newly supplied Shivangi image.
- Testimonial placeholders replaced with three public recommendations/testimonials.
- Vercel API, form fields, social links and domain setup remain unchanged.

## V16 updates
- Who We Work With replaced with the approved B2B early-stage copy.
- Exact official TCL-Logo(3) is used for header, footer and favicon.
- Exact official TCL logo added back into the Losing Customers artwork area at a controlled size.

## V17 fixes
- Removed the oversized logo overlay from the Losing Customers artwork.
- Kept the old incorrect baked-in logo area masked cleanly.
- Redesigned Who We Work With into an editorial two-column GTM section while preserving the approved paragraph verbatim.

## V18 update
- Removed the EARLY-STAGE B2B label from Who We Work With. Everything else remains unchanged.

## V19 update
- Fixed false required-field validation in the enquiry popup.
- Added stable field IDs and JSON submission to /api/contact.
- Added sending, success and error states and duplicate-submit protection.


## V20 fixes
- Removed the duplicate JavaScript form handler that caused a syntax error in V19.
- Form now has one submission path and sends JSON to /api/contact.
- Added robust JSON body handling in the Vercel function.
- Added versioned CSS and JS filenames to stop phones/CDNs from loading stale frontend assets.
- Added no-cache headers for the homepage and immutable cache headers for versioned assets.
- Added mobile nav, modal, input, layout and overflow fixes.
- Existing content, logo, team, testimonials and leak artwork treatment remain unchanged.


## V23 final mobile artwork fix
- Desktop layout is unchanged.
- Mobile leak artwork now uses the same 2:1 display box as desktop.
- The original 3:2 artwork is contained inside it, reproducing the desktop white side margins.
- Mobile logo mask and FIX THE LEAK hotspot now use the exact desktop geometry.
- Removed the nested mobile-width shrink through a final high-specificity override.
