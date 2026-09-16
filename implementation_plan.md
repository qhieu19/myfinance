# Build Expense Tracker WebApp

## User Review Required

> [!IMPORTANT]
> Please confirm the following decisions:
> - **Data persistence**: Use `localStorage` for client‑side storage, or set up a backend API?
> - **UI theme**: Preferred color palette (e.g., dark mode with teal accents) and any branding guidelines?
> - **Responsiveness**: Should the app be fully mobile‑responsive?

## Open Questions

- Which storage mechanism should be used for persisting expense data?
- Any specific design language or brand colors you’d like to apply?
- Do you need features such as editing or deleting existing entries?

## Proposed Changes

### Frontend Components

#### [NEW] `index.html`
- Basic HTML5 structure with semantic elements.
- Sections: Header, Fixed Expenses Form, Daily Expenses Form, Summary Display.
- Include links to `styles.css` and `script.js`.

#### [NEW] `styles.css`
- Implements a premium, modern UI using a harmonious HSL palette, glassmorphism cards, and smooth micro‑animations.
- Responsive layout with CSS Grid/Flexbox.
- Custom typography using Google Font **Inter**.

#### [NEW] `script.js`
- Handles form submissions, validates inputs, and stores entries.
- Calculates totals for fixed expenses, daily expenses, and remaining balance.
- Persists data using `localStorage` (subject to confirmation).
- Updates the UI dynamically without page reloads.

### Core Features

- **Fixed Expenses Input**: Date, description, amount fields.
- **Daily Expenses Input**: Date, description, amount fields.
- **Summary Card**: Shows income (hard‑coded 60,000,000 VND), total fixed, total daily, and remaining amount.
- **Data Persistence**: Save all entries to `localStorage` so data survives page refreshes.
- **Responsive Design**: Ensure UI looks great on desktop and mobile devices.

## Verification Plan

### Manual Verification
- Populate the app with sample fixed and daily expense entries.
- Verify that the summary calculations are correct.
- Refresh the browser and confirm that data persists.
- Test on different screen sizes to ensure responsiveness.

### Automated Tests
- (Optional) Add simple unit tests for calculation functions using a JS testing framework like Jasmine if needed.

---
*Implementation plan created. Please review the open questions and confirm the decisions so we can proceed with development.*
