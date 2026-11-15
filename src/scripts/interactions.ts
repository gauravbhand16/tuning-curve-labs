import gsap from 'gsap';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const navToggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
const mobileNav = document.querySelector<HTMLElement>('[data-mobile-nav]');
if (navToggle && mobileNav) {
  const navLinks = [...mobileNav.querySelectorAll<HTMLElement>('a[href]')];
  const setNavOpen = (open: boolean) => {
    navToggle.setAttribute('aria-expanded', String(open));
    mobileNav.classList.toggle('is-open', open);
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && !reduceMotion) {
      gsap.fromTo(navLinks, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out' });
    }
    if (open) navLinks[0]?.focus();
    else navToggle.focus();
  };
  navToggle.addEventListener('click', () => setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
  mobileNav.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href]')) setNavOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (navToggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setNavOpen(false);
    }
  });
}

const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  const syncHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });
}

const revealTargets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
if (revealTargets.length) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('in'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.18 });
    revealTargets.forEach((element) => revealObserver.observe(element));
  }
}

document.querySelectorAll<HTMLFormElement>('.lead-form').forEach((form) => {
  const countrySelect = form.querySelector<HTMLSelectElement>('[data-country-select]');
  const countryCodeSelect = form.querySelector<HTMLSelectElement>('[data-country-code-select]');
  const dialCodes: Record<string, string> = {
    India: '+91',
    'United Arab Emirates': '+971',
    'Saudi Arabia': '+966',
    Qatar: '+974',
    Kuwait: '+965',
    Oman: '+968',
    Bahrain: '+973',
    'United States': '+1',
    'United Kingdom': '+44',
    Singapore: '+65',
    Australia: '+61',
  };
  const syncDialCode = () => {
    if (!countrySelect || !countryCodeSelect) return;
    const expectedCode = dialCodes[countrySelect.value];
    if (expectedCode) countryCodeSelect.value = expectedCode;
    else countryCodeSelect.value = '';
  };
  countrySelect?.addEventListener('change', syncDialCode);
  syncDialCode();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('.submit');
    const message = form.querySelector<HTMLElement>('.form-msg');
    const report = (text: string, state: 'error' | 'ok' | 'pending' = 'error') => {
      if (!message) return;
      message.textContent = text;
      message.dataset.state = state;
    };
    if (!button || !message) return;

    const values = Object.fromEntries(new FormData(form).entries());
    if (values.website) return;
    if (!values.Name || !values.Email || !values.Country || !values.Details) {
      report('Please add your name, email, country and enquiry details.');
      return;
    }
    const emailInput = form.querySelector<HTMLInputElement>('input[name="Email"]');
    const email = String(values.Email).trim();
    if (!emailInput?.checkValidity() || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
      report("That email address doesn't look right.");
      return;
    }
    values.Email = email;

    const phone = String(values.Phone ?? '').trim();
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      const country = String(values.Country);
      const expectedCode = dialCodes[country];
      const selectedCode = String(values.CountryCode ?? '');
      const expectedDigits: Record<string, number> = {
        India: 10,
        'United Arab Emirates': 9,
        'Saudi Arabia': 9,
        Qatar: 8,
        Kuwait: 8,
        Oman: 8,
        Bahrain: 8,
        'United States': 10,
        'United Kingdom': 10,
        Singapore: 8,
        Australia: 9,
      };
      if (!selectedCode || !/^[\d\s()+.-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        report('Enter a valid phone number with its country code.');
        return;
      }
      if (expectedCode && selectedCode !== expectedCode) {
        report('The phone country code must match the country you selected.');
        return;
      }
      if (expectedDigits[country] && digits.length !== expectedDigits[country]) {
        report(`Enter a ${expectedDigits[country]}-digit phone number for ${country}.`);
        return;
      }
    }

    if (form.dataset.sending === 'true') return;
    const payload = {
      Name: String(values.Name).trim(),
      Email: email,
      Country: String(values.Country),
      CountryCode: String(values.CountryCode ?? ''),
      Phone: phone,
      Details: String(values.Details).trim(),
      website: '',
    };
    const failure = 'We could not send your enquiry right now. Your details are still here, so please try again, or email support@tuningcurvelabs.com.';
    const idleLabel = button.textContent;
    form.dataset.sending = 'true';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = 'Sending…';
    report('Sending your enquiry…', 'pending');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let result: { ok?: boolean; message?: string } = {};
      try { result = await response.json(); } catch { /* the endpoint did not return JSON */ }
      if (response.ok && result.ok) {
        form.reset();
        syncDialCode();
        report(result.message || 'Thanks, your enquiry has been sent.', 'ok');
      } else {
        // Entered values stay in the form so the visitor can correct them or try again.
        report(result.message || failure);
      }
    } catch {
      report(failure);
    } finally {
      window.clearTimeout(timeout);
      button.disabled = false;
      button.textContent = idleLabel;
      form.removeAttribute('aria-busy');
      delete form.dataset.sending;
    }
  });
});

const videoDialog = document.querySelector<HTMLDialogElement>('[data-video-dialog]');
const leakVideo = videoDialog?.querySelector<HTMLVideoElement>('[data-leak-video]');
if (videoDialog && leakVideo) {
  document.querySelectorAll<HTMLButtonElement>('[data-video-open]').forEach((trigger) => {
    trigger.addEventListener('click', async () => {
      const source = trigger.dataset.videoSrc;
      if (source && leakVideo.querySelector('source')?.getAttribute('src') !== source) {
        const videoSource = leakVideo.querySelector('source');
        if (videoSource) videoSource.src = source;
        leakVideo.load();
      }
      videoDialog.showModal();
      try { await leakVideo.play(); } catch { /* Playback can wait for the user's play button. */ }
    });
  });
  const closeVideo = () => {
    leakVideo.pause();
    leakVideo.currentTime = 0;
  };
  videoDialog.querySelector('[data-video-close]')?.addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('close', closeVideo);
  videoDialog.addEventListener('click', (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });
}
