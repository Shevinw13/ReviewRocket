# Nudgli Website Project Context

## What is Nudgli?

Nudgli is a mobile iOS app that helps small service businesses generate more Google reviews by automatically texting customers after a completed service. The core workflow: business owner enters a customer's phone number → automated SMS asks for a 1-5 rating → positive ratings (4-5) get a Google Review link → negative ratings (1-3) route private feedback to the business owner's inbox for follow-up.

Target audience: Single-owner local service businesses (plumbers, barbers, dentists, cleaners, etc.)

---

## Brand Identity

**Personality:** Modern, Trustworthy, Professional, Fast, Simple
**Inspired by:** Stripe, Ramp, Square, Linear, Cal.com, Raycast

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Navy | `#0B1D3A` | Primary dark — text, backgrounds |
| Teal | `#0CBFA6` | Primary accent — CTAs, active elements |
| Mint | `#E6F9F6` | Light teal accent — section backgrounds |
| Success Green | `#22C55E` | Positive feedback, success states |
| White | `#FFFFFF` | Base background |
| Card Background | `#F2F4F7` | Elevated surfaces |
| Light Gray | `#E5E7EB` | Borders, dividers |

### Typography

- **Heading:** 24px / 32px line-height / Bold (700)
- **Body:** 16px / 24px line-height / Regular (400)
- **Caption:** 12px / 16px line-height / Regular (400)

For the website, scale these up for desktop (headings 48-64px hero, 32-40px section headers, 18px body).

### Spacing

4pt grid system. Key values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

### Logo/App Info

- App name: **Nudgli**
- Bundle ID: `com.nudgli.app`
- Icon background color: `#0B1D3A` (Navy)
- Accent color for notifications: `#0CBFA6` (Teal)

---

## Website Requirements

### Purpose
Static, read-only marketing site showcasing Nudgli, its benefits, and ease of use. No user accounts, no payments, no dynamic features.

### Primary CTA
App Store download button (iOS)

### Design Direction
- Sleek and modern but emphasizes **simplicity** and **ease of use**
- Minimal, confident, lots of whitespace
- Clean SaaS landing page style (Linear, Raycast, Cal.com aesthetic)
- Show the app experience visually — mock phone screens, step-by-step flows
- Make it obvious this is dead simple to use

### Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **GitHub repo:** https://github.com/Shevinw13/nudgli-website.git

---

## Site Sections & Content

### 1. Hero Section
- Bold headline communicating the core value: "Turn every happy customer into a Google review"
- Subheadline: emphasize simplicity — "One text. One tap. More reviews."
- App Store download button (primary CTA)
- Hero image: phone mockup showing the app in action

### 2. How It Works (3-Step Flow)
Visual step-by-step:
1. **Send a text** — After a service, enter your customer's phone number and tap send
2. **Customer rates** — They reply with a rating from 1-5 via text message
3. **Reviews grow** — Happy customers (4-5) get your Google Review link. Unhappy ones (1-3) send you private feedback to fix.

### 3. Features Section
Key features to highlight:

- **One-Tap SMS Requests** — Just enter a phone number. Optional customer name and service type. That's it.
- **Smart Routing** — Positive ratings → Google Reviews. Negative ratings → Private feedback inbox. Automatically.
- **Real-Time Dashboard** — See reviews sent, positive responses, needs attention count, and month-over-month growth at a glance.
- **Feedback Inbox** — View negative feedback, call customers directly, mark issues resolved. All in one place.
- **Push Notifications** — Get alerted within 60 seconds of new feedback or when you're approaching your SMS limit.
- **Offline Resilient** — Forms are cached locally. Failed sends retry automatically with exponential backoff. Nothing gets lost.
- **Secure by Default** — AES-256 encryption for all customer data. Audit logging. GDPR-style deletion on request.
- **Duplicate Protection** — Warns you if a customer was already texted in the last 24 hours.
- **Conversation Expiry** — Customers have 72 hours to respond. After that, the conversation closes automatically.
- **Invalid Response Handling** — If a customer sends something other than 1-5, we ask once more. After 2 invalid attempts, we politely end the conversation.

### 4. Pricing Section (Informational Only)

| Tier | SMS/Month | Best For |
|------|-----------|----------|
| Starter | 50 | Solo operators just getting started |
| Growth | 200 | Growing businesses with steady clients |
| Pro | 1,000 | High-volume service businesses |

- All tiers include all features
- Subscription managed via Apple App Store
- Note: "Download the app to start your free trial" or similar

### 5. The SMS Experience
Show what the customer sees — the actual text conversation:
- Business sends: "Hi [Name], Thank you for choosing [Business]. On a scale of 1-5, how would you rate your experience today? Reply with a number from 1 to 5."
- Customer replies: "5"
- Response: Thank you message + Google Review link
- OR if customer replies "2" → "We're sorry to hear that. We'd love to understand what went wrong..."

### 6. Footer
- App Store download link
- Contact/support email
- Privacy Policy link
- Terms of Service link
- Social links (if any)
- © 2024 Nudgli. All rights reserved.

---

## App Features (Full Detail for Reference)

### Core Workflow
1. Business owner signs up with: First Name, Last Name, Business Name, Email, Password, Google Review URL
2. Sends SMS via the app: enters phone number → optional customer name → optional service type → tap Send
3. SMS goes out from (833) 123-4567 with personalized message
4. Customer replies with 1-5 rating
5. Rating 4-5: "Thanks! Would you mind leaving us a review?" + Google Review URL
6. Rating 1-3: "We're sorry... Would you mind sharing a few more details?" → stores up to 500 chars of feedback
7. Business gets push notification for negative ratings and written feedback
8. Feedback appears in Inbox → "Call Customer" or "Mark Resolved"

### Dashboard Metrics
- Review Opportunities Created (monthly count)
- Month-over-month % change (N/A if previous month is zero)
- Positive Responses (4-5 ratings)
- Needs Attention (1-3 ratings)
- Requests Sent
- Recent Activity Feed (last 10 ratings, newest first)

### Subscription Tiers
- **Starter:** 50 SMS/month — $9.99/mo (default for new accounts)
- **Growth:** 200 SMS/month — $29.99/mo
- **Pro:** 1,000 SMS/month — $49.99/mo
- Managed via Apple In-App Purchase
- 80% quota warning notification
- Blocked from sending when quota exceeded → prompted to upgrade

### Security & Privacy
- AES-256-GCM encryption for customer phone, name, feedback text at rest
- TLS 1.2+ for all data in transit
- Row Level Security — business owners can only see their own data
- Audit logging for all sensitive operations
- Customer data deletion within 30 days of request
- No sensitive data in application logs

### Reliability
- 3 retries with exponential backoff (1s, 2s, 4s) for failed requests
- SMS queue with 5-min retry interval for up to 24 hours
- Form data cached locally (up to 50 pending, 30-day retention)
- Error boundaries prevent crashes — friendly recovery screen
- 2-second app launch target on 4G LTE

### Push Notifications
- Negative rating received (within 60 seconds)
- Written feedback received (within 60 seconds)
- 80% quota warning
- SMS delivery failure after 24 hours of retries
- Tap notification → navigate to relevant inbox item

---

## Design Notes for Website

- Use phone mockups showing actual app screens (Dashboard, Send Request, Inbox)
- Animate the 3-step flow if possible (subtle, not flashy)
- Large, readable text — the site itself should feel as simple as the app
- Navy background sections with white/teal text for contrast
- White sections with navy text for readability
- Teal for CTAs and interactive elements
- Card-style feature blocks on light gray or mint backgrounds
- Mobile-responsive (site should look great on phones since users will find it via App Store link searches)
- Fast — aim for 100 Lighthouse performance score (static site, should be easy)

---

## Implementation Tasks

### Phase 1: Project Setup
1. Initialize Next.js project with App Router and TypeScript
2. Install and configure Tailwind CSS with the Nudgli color palette and spacing scale
3. Set up project structure: `app/`, `components/`, `lib/`, `public/`
4. Configure deployment to Vercel
5. Set up GitHub repo connection

### Phase 2: Layout & Components
6. Create root layout with global styles, fonts (Inter or similar clean sans-serif), metadata
7. Build responsive Navbar component (logo + "Download" CTA button)
8. Build Footer component (links, copyright, App Store badge)
9. Create reusable Button component (primary teal, secondary outline)
10. Create reusable SectionWrapper component for consistent spacing/max-width

### Phase 3: Hero Section
11. Build Hero section with headline, subheadline, App Store button, and phone mockup
12. Create or source phone mockup frame for app screenshots
13. Add subtle gradient or background element (navy → teal)

### Phase 4: How It Works
14. Build 3-step horizontal flow with icons/illustrations
15. Step 1: "Send a text" with phone input illustration
16. Step 2: "Customer rates" with SMS bubble illustration
17. Step 3: "Reviews grow" with star/Google icon illustration
18. Add connecting lines or arrows between steps

### Phase 5: Features Section
19. Build feature grid (2-3 columns on desktop, stacked on mobile)
20. Create FeatureCard component with icon, title, description
21. Populate with all 10 features from content spec
22. Optional: add phone mockup showing relevant screen for key features

### Phase 6: SMS Experience / Social Proof
23. Build SMS conversation mockup showing the customer interaction flow
24. Style as realistic iMessage-style bubbles
25. Show both positive (5-star → review link) and negative (2-star → feedback prompt) paths

### Phase 7: Pricing Section
26. Build pricing tier cards (3 tiers side-by-side)
27. Highlight Growth as "Most Popular" or recommended
28. Include feature list (all features included in every tier)
29. CTA: "Download to get started" (no purchase on web)

### Phase 8: Polish & Deploy
30. Add smooth scroll navigation from navbar
31. Add scroll-triggered fade-in animations (subtle, using Intersection Observer or Framer Motion)
32. Optimize all images (Next.js Image component, WebP)
33. Add meta tags, Open Graph, favicon
34. Test responsive design (mobile, tablet, desktop)
35. Run Lighthouse audit and fix any issues
36. Deploy to Vercel and connect custom domain

---

## File Structure (Suggested)

```
nudgli-website/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Home page (all sections)
│   ├── privacy/page.tsx    # Privacy policy
│   └── terms/page.tsx      # Terms of service
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── HowItWorks.tsx
│   ├── Features.tsx
│   ├── SmsDemo.tsx
│   ├── Pricing.tsx
│   ├── Button.tsx
│   ├── FeatureCard.tsx
│   ├── PhoneMockup.tsx
│   └── SectionWrapper.tsx
├── lib/
│   └── constants.ts        # Colors, pricing data, feature list
├── public/
│   ├── images/
│   │   ├── app-screenshot-dashboard.png
│   │   ├── app-screenshot-send.png
│   │   ├── app-screenshot-inbox.png
│   │   └── phone-frame.png
│   ├── favicon.ico
│   └── og-image.png
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```
