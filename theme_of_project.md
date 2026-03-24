# Maison Tissue - Frontend Theme & UI Guide
*Where Art Meets Couture*

## 1. Core Aesthetic
The Maison Tissue frontend is designed with a **"Haute Couture & Cinematic"** aesthetic. The design prioritizes elegance, minimalism, and high-end luxury, using stark contrasts, refined typography, and subtle micro-animations to create a premium user experience akin to stepping into a high-end fashion atelier.

## 2. Color Palette
The color scheme revolves around a deep, sophisticated dark mode contrasted with warm, luxurious accents

- **Noir (`#0D0D0D`)**: The primary background color. Off-black, providing deep contrast without the harshness of pure black.
- **Ivory (`#F5F5F0`)**: The primary text color. A warm, elegant off-white that reduces eye strain while maintaining a premium feel.
- **Gold (`#C6A75E`)**: The primary accent color used for buttons, links, active states, and borders.
  - *Light Gold (`#D4BA7A`)*: For hover states and highlights.
  - *Dark Gold (`#A88B3D`)*: For pressed states and deeper accents.
  - *Muted Gold (`rgba(198, 167, 94, 0.15)`)*: For subtle backgrounds and glows.
- **Muted (`#1A1A1A`) & Subtle (`#2A2A2A`)**: Used to create depth, borders, and secondary surfaces within the dark theme.
- **Contextual Accents**:
  - *Blush (`#D4A0A0`)*
  - *Emerald (`#2D5A4A`)*
  - *Champagne (`#E8D5B7`)*

## 3. Typography
The typography relies on a combination of classic, elegant serif fonts for headings and modern, legible sans-serif fonts for the body text:

- **Heading/Display Font**: `Playfair Display`, `Georgia`, `serif`. Used for all major titles (`h1`, `h2`), providing a classic, editorial fashion magazine look.
- **Body Font**: `Inter`, `system-ui`, `sans-serif`. Used for regular text, labels, and paragraphs, ensuring maximum readability and a clean, modern interface.
- **Letter Spacing**:
  - *Luxury (`0.2em`)*: Widely spaced text, typically used for uppercase subheadings and navigation links to convey elegance.
  - *Editorial (`0.15em`)*: Slightly wide spacing for important callouts.

## 4. Visual Effects & Shadows
Drop shadows and glows are used precisely to elevate elements off the dark background without appearing heavy:

- **Glow Gold**: A soft golden aura (`0 0 30px rgba(198, 167, 94, 0.15)`) used for premium buttons or active states.
- **Editorial Shadow**: A deep, atmospheric drop shadow (`0 25px 60px -15px rgba(0, 0, 0, 0.5)`) for large imagery or modals.
- **Card & Soft Shadows**: For panels, dropdowns, and interactive elements.

## 5. Animations & Interactions
Micro-animations breathe life into the application, making the interface feel dynamic and responsive:

- **Fade-In / Fade-Up / Slide-Up**: Smooth, cubic-bezier easing animations used when pages load or when elements scroll into view, ensuring content enters gracefully.
- **Shimmer**: A continuous, pulsing opacity animation (`2.5s ease-in-out`), often used for loading states or premium visual indicators (like the scroll hint).
- **Glow**: A pulsating golden box-shadow effect used to subtly draw attention to primary actions.
- **Parallax**: Slow, linear vertical movement to create depth on background imagery.

## 6. CSS Framework
- **Tailwind CSS (`v4.x/v3.x pattern`)**: The entire theme is driven by Tailwind CSS, unified in the `tailwind.config.js` file, ensuring highly consistent styling via utility classes rather than disjointed custom CSS.
