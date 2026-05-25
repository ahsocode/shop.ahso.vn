# Design

## Design System Summary

ahso.vn should feel like a premium industrial showcase: white-led, minimal, technical, structured, and trustworthy. The visual language combines Apple-like clarity and spacing with industrial precision. It should use real solution, software, factory, machinery, project, or implementation imagery wherever possible, with admin-managed hero/banner assets as a core content mechanism.

The default public experience is brand-focused. Admin and staff areas should use a quieter product-tool treatment: practical, clear, detailed, and optimized for content publishing and request handling.

## Brand Assets

- Logo: Keep the existing AHSO logo unchanged.
- Brand colors: The logo contains red, yellow, and blue. These may inform accents and state colors, but the website should remain primarily white.
- Product/shop link: Keep a visible route or navigation item that sends users to the product shop subdomain when they need products.

## Color

Use a white-first palette with lightly tinted neutrals and controlled brand accents. Avoid gradients, especially blue-purple or purple-toned gradients, because they make the interface feel artificial and AI-generated.

Recommended roles:

- Background: warm or cool white, not pure decorative color.
- Surface: white or very light neutral for cards, panels, and admin areas.
- Text: near-black neutral with enough contrast, avoiding overly harsh pure black when possible.
- Muted text: neutral gray for supporting copy.
- Primary accent: AHSO blue for primary actions, links, and focused states.
- Secondary accents: AHSO red and yellow only as restrained highlights, status cues, or brand details.
- Border: light neutral lines for structure.
- Success/warning/error: use clear semantic colors with sufficient contrast.

Rules:

- Do not use decorative gradients unless explicitly approved.
- Do not use purple, blue-purple, or neon AI-like palettes.
- Keep dominant surfaces white and clean.
- Use accent color sparingly so calls to action stay clear.

## Typography

Use a modern, clean, technical type direction that renders Vietnamese reliably. Prefer fonts with strong Vietnamese support and low risk across browsers, such as Inter, Be Vietnam Pro, IBM Plex Sans, or system UI fallbacks.

Typography should be:

- Clear and modern.
- Compact enough for technical information.
- Spacious enough for showcase sections.
- Free from overly decorative or fragile display styles.

Copy should be concise: names, short summaries, and enough context for users to understand the offer before choosing a next action.

## Layout

Public pages should be spacious, focused, and easy to scan. Use clear section rhythm: hero, showcase, solution/software groups, proof or outcomes, contact/quotation CTA, and shop subdomain entry where relevant.

Layout direction:

- Prefer generous whitespace and strong hierarchy.
- Keep sections purposeful; avoid stacking many competing content blocks.
- Use minimal cards with real imagery and short copy.
- Avoid nested cards and decorative containers.
- Use structured grids for solution/software listings.
- Preserve a clear path to request quotation or contact.
- On mobile, prioritize fast scanning, simple navigation, visible CTAs, and readable summaries.

## Hero And Showcase

The homepage should include a hero area that supports admin-updated imagery or banners. The hero should communicate AHSO's industrial focus immediately, then guide users toward solutions, software, quotation, or contact.

Showcase sections should prioritize:

- Solution/software name.
- A short benefit-oriented description.
- Strong image or visual proof.
- Clear CTA.
- Optional supporting detail when it helps decision making.

Cards should be minimal: image-led, low decoration, concise copy, restrained borders, and clear hover feedback.

## Motion

Use GSAP where animation is meaningful and consistent with the existing project rules. Motion should be moderate, smooth, and purposeful.

Preferred patterns:

- Scroll reveal.
- Light parallax.
- Sticky showcase sections.
- Product or software mockup movement.
- Hover micro-interactions.
- Smooth transitions for state changes.

Avoid motion that feels decorative, noisy, slow, or distracting. Respect reduced-motion preferences where practical.

## Components

Use shadcn/ui components by default and keep them aligned with the project's conventions.

Component guidance:

- Buttons: clear primary/secondary hierarchy, concise labels, icon support where helpful.
- Cards: minimal, image-led for public showcase, detail-focused for admin lists.
- Forms: short, clear, with explicit loading, success, warning, and error states.
- Navigation: simple and predictable, with a visible path to solutions, software, contact/quotation, and product shop.
- Tables/admin lists: practical, readable, searchable/filterable where needed.
- Notifications: use Sonner for all user-facing feedback; never use browser alert/confirm/prompt.

## Admin And Staff UI

Admin and staff screens should prioritize speed, clarity, and confidence. These areas support article/content publishing, contact request handling, and quotation request handling.

Guidance:

- Use dense but readable layouts.
- Make statuses, ownership, and next actions obvious.
- Provide loading, empty, error, and success states.
- Avoid visual noise and unnecessary animation.
- Keep forms structured and easy to complete.
- Prefer explicit labels over clever wording.

## Content Voice

The tone is expert, concise, direct, and lightly consultative where useful. Avoid exaggeration, vague claims, and machine-like marketing phrases.

All user-facing interface copy must be written in Vietnamese with proper diacritics. Do not ship Vietnamese without diacritics in buttons, labels, navigation, empty states, notifications, form helper text, validation messages, headings, or CTA copy. English is acceptable only for unavoidable product names, technical terms, URLs, brand names, or identifiers.

Public copy should help users answer:

- What does AHSO provide?
- Is this relevant to my industrial need?
- What proof or outcome can I review?
- What should I do next?

CTA language can include:

- Nhận tư vấn giải pháp
- Yêu cầu báo giá
- Trao đổi với AHSO
- Xem giải pháp
- Xem phần mềm

Use polished Vietnamese copy in the UI itself; avoid robotic phrasing.

## Accessibility And Responsive Behavior

Design for clear Vietnamese readability with full diacritics, strong contrast, keyboard access, and obvious interactive states. Mobile should be simple, fast, and information-rich enough for industrial users to understand the offer without getting lost.

Responsive priorities:

- Mobile navigation must be simple.
- Primary CTAs must remain easy to find.
- Images should be optimized and not block comprehension.
- Long technical content should be chunked into scan-friendly sections.
- Forms should be short and easy to complete.
