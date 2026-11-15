import shivangiPhoto from '../../assets/shivangi-malviya.jpg';

export const site = {
  name: 'Tuning Curve Labs',
  legalName: 'Tuning Curve Labs LLP',
  domain: 'https://www.tuningcurvelabs.com',
  email: 'support@tuningcurvelabs.com',
  bookingUrl: 'https://calendar.app.google/7AX5ws4beBSAVJmY9',
  whatsappUrl: 'https://wa.me/916263088114',
  location: 'Indore, Madhya Pradesh, India',
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tuningcurve/' },
    { label: 'Instagram', href: 'https://www.instagram.com/tuningcurvelabs' },
    { label: 'X', href: 'https://x.com/tuningcurvelabs' },
  ],
};

export const bookingLabel = 'Fix your sales leak now for free.';

export const services = [
  {
    number: '01',
    slug: 'revenue-operations',
    name: 'Revenue Operations',
    problem: "You can't clearly see where deals are getting stuck.",
    summary: 'We map your sales process, improve handoffs and build better visibility from the first enquiry to a signed deal.',
  },
  {
    number: '02',
    slug: 'gtm-engineering',
    name: 'GTM Engineering',
    problem: "You have a plan, but it isn't making its way into everyday work.",
    summary: 'We turn GTM strategy into practical systems and workflows your team can actually use and manage.',
  },
  {
    number: '03',
    slug: 'growth-experimentation',
    name: 'Growth Experimentation',
    problem: "You're unsure what to try next or where to focus.",
    summary: 'We test assumptions with real buyers, learn from the results and focus on what the evidence supports.',
  },
  {
    number: '04',
    slug: 'social-media-strategy',
    name: 'Social Media Strategy',
    problem: "You're posting, but the right buyers aren't paying attention.",
    summary: 'We give your social presence a clear direction, helping buyers understand what you do and why it matters.',
  },
  {
    number: '05',
    slug: 'marketing-execution',
    name: 'Marketing Execution',
    problem: "There's plenty happening, but it's hard to tell what's working.",
    summary: 'We plan and coordinate marketing activities around clear goals and meaningful buyer signals, not just output.',
  },
  {
    number: '06',
    slug: 'brand-and-web',
    name: 'Brand & Web',
    problem: "Your website or brand isn't making your value clear.",
    summary: 'We work on positioning, website strategy, copy, design and development to help the right buyers understand why they should choose you.',
  },
];

export const nycCase = {
  name: 'NYC Engineering Recruiting Firm',
  who: 'An engineering recruiting firm in New York City. The client name is withheld.',
  challenge: 'The firm needed a repeatable way to reach venture-backed founders making their first engineering hires, and to look credible when those founders checked them out online.',
  did: [
    'Ran structured tests on who to target, what to say and which channel to use, then kept what worked.',
    'Designed and ran outreach to YC-backed and VC-funded founders.',
    'Built founder-led content on LinkedIn and X so prospects saw a point of view, not only a recruiting pitch.',
    'Helped the firm place founding engineers at YC-backed and VC-funded startups.',
  ],
  results: [
    { value: '7', label: 'YC companies signed' },
    { value: '20+', label: 'founding engineers placed' },
    { value: '24%', label: 'outbound reply rate' },
    { value: '2,300+', label: "followers on the founder's X account" },
  ],
  length: '4 months',
};

export const proofLine = '7 Y Combinator companies signed in 4 months for an NYC engineering recruiting firm.';

export const nycStory = {
  id: '01',
  name: nycCase.name,
  kicker: 'NYC engineering recruiting firm',
  summary: nycCase.challenge,
  points: nycCase.did,
  results: nycCase.results,
  length: `Engagement length: ${nycCase.length}`,
  withheld: 'The client name is withheld.',
};

export const testKartStory = {
  id: '02',
  name: 'TestKart',
  kicker: 'Education marketplace',
  summary: 'Part-time product marketing for a platform that lets teachers run tests online.',
  points: [
    'Ran a Hindi masterclass, “Grow your teaching business online with AI.”',
    'Built a teacher email sequence to onboard and activate new teachers.',
    'Added an empty-dashboard action so new teachers had a first step.',
  ],
  results: [
    { value: '150%', label: 'more product link clicks and product creation' },
    { value: '~40', label: 'masterclass registrations' },
  ],
  note: '10+ teachers converted from 90 qualified leads in the YouTube-teacher outbound sequence.',
};

export const greenLoopStory = {
  id: '03',
  name: 'GreenLoop Cleantech',
  kicker: 'Carbon and cleantech · India and USA',
  did: 'Mapped five market segments and developed messaging for each, so the business could explain itself in every one.',
  results: [{ value: '5', label: 'market segments' }],
  quote: {
    text: 'They helped us simplify our positioning and get much clearer about who we should be speaking to and how.',
    attribution: 'Rachana, Co-Founder, GreenLoop Cleantech · a Tuning Curve Labs client',
  },
};

export const kesariStory = {
  id: '04',
  name: 'Kesari Conchem',
  kicker: 'Waterproofing chemicals',
  summary: 'Prioritization across developers, contractors, architects and infrastructure buyers.',
  points: ['Used market evidence to decide which buyer groups to focus on before launch.'],
  results: [{ value: '2', label: 'buyers before launch' }],
  note: 'Evidence of selling to two buyers before launch.',
};

export const whyPoints = [
  {
    title: 'We research before recommending.',
    text: "We look at what's actually happening before suggesting another campaign, tool or hire.",
  },
  {
    title: "We won't push spend that doesn't make sense.",
    text: "If the evidence doesn't support more investment, we'll say so.",
  },
  {
    title: 'We work alongside your team.',
    text: "We don't leave you with a strategy document and expect you to figure out the rest.",
  },
  {
    title: 'What we build stays yours.',
    text: 'Your systems and workflows are set up under your accounts, so your team can own and manage them.',
  },
];

export const faqs = [
  {
    question: 'What exactly is GTM?',
    answer: 'GTM, or go-to-market, is how your business finds the right customers, communicates its value and turns interest into revenue.',
  },
  {
    question: 'Do I need to understand marketing or GTM to work with you?',
    answer: 'No. You know your business. We help make sense of the growth challenges and explain what needs attention in plain language.',
  },
  {
    question: "What if we don't have a CRM or organised sales data?",
    answer: "That's fine. We start with whatever information you have, whether it's spreadsheets, emails, WhatsApp conversations or existing records.",
  },
  {
    question: 'Do we need to use new tools?',
    answer: "Not necessarily. We first look at what you're already using and work within that wherever possible.",
  },
  {
    question: 'Are we a marketing agency?',
    answer: "We do more than execute marketing activities. We look at the wider go-to-market setup, identify what's holding growth back and help implement the right fixes across our areas of expertise.",
  },
  {
    question: 'Do we need all six services?',
    answer: 'No. We recommend only the areas relevant to the issues we find.',
  },
  {
    question: 'What does Week One cost?',
    answer: "We'll explain the scope and fee before starting.",
  },
  {
    question: 'What happens after Week One?',
    answer: "If you want us to implement the recommendations, we'll agree on the priority, scope and next steps together. We can continue month by month.",
  },
];

export const team = [
  {
    name: 'Shivangi Malviya',
    role: 'Founder · GTM and Product Strategist',
    location: 'Indore, India',
    image: shivangiPhoto.src,
    alt: 'Shivangi Malviya, Founder of Tuning Curve Labs',
    bio: 'I’ve run go-to-market across fintech, marketplaces, e-learning and manufacturing. Different categories, same discipline.',
    story: 'From 2019 to 2023 I worked in a systems neuroscience lab at National Tsing Hua University in Taiwan. That’s where the name comes from: a tuning curve maps how strongly a neuron responds across a range of signals, and its peak shows the one it’s tuned to.',
    closing: 'We look for the same thing in your market: the signal your buyers respond to. I work with businesses across India, the UAE, the US and wider Asia.',
    linkedin: 'https://www.linkedin.com/in/shivangi-malviya1105',
  },
];
