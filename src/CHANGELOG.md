Based on the work done in this session:

---
### 2026-04-25

14. **Documents — Download** — Added a download button (⬇️) in the actions column of the files table; clicking it fetches the file as a blob and triggers a native browser download with the original filename

---

1. **Documents** — Added thumbnail preview column and Copy URL button to the files table
2. **Invoices — Discount** — Added discount type selector (percentage / fixed amount) with calculated discount value
3. **Invoices — Item price type** — Replaced free-text service type with a price type selector (Hourly / Fixed / Daily / No price); "No price" hides qty and price columns
4. **Invoices — Service period job filter** — Job picker now filters by the selected service period dates
5. **Invoices — Period quick filters** — Added Last week / 2 weeks / This month / Custom buttons for service period selection
6. **Invoices — Layout** — Linked Jobs and Service Period moved side by side (50/50 on desktop, stacked on mobile)
7. **Invoices — Add all jobs** — Added "Add all (N)" button to link all unlinked jobs from the selected period at once
8. **Invoices — Job filter** — Job picker now only shows jobs with status "confirmed"
9. **Invoices — PDF download** — Added a download PDF icon button directly in each table row
10. **Invoices — Table actions** — View and Edit buttons now show icons only (label moved to tooltip)
11. **Invoices — Date filters** — Added Today / This Week / This Month / By Date filter buttons to the invoices toolbar, matching the Jobs page
12. **Settings — General Page** — Added owner-only General settings page (`/settings/general`) with company info (name, contact email/phone, timezone, default language), address, and branding (logo URL, primary color); Settings now defaults to this page
13. **Invoices — Branded header** — Invoice form now shows a live preview header (logo + company info on the left, INVOICE title + number + dates + Bill To on the right); same layout applied to all PDF downloads (table row and form button)
