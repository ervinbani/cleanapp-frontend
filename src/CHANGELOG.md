# Changelog

Based on the work done in this session.

## 2026-04-25

1. **Documents - Thumbnails** - Added thumbnail preview column and Copy URL button to the files table.
2. **Invoices - Discount** - Added discount type selector (percentage / fixed amount) with calculated discount value.
3. **Invoices - Item price type** - Replaced free-text service type with a price type selector (Hourly / Fixed / Daily / No price); "No price" hides qty and price columns.
4. **Invoices - Service period job filter** - Job picker now filters by the selected service period dates.
5. **Invoices - Period quick filters** - Added Last week / 2 weeks / This month / Custom buttons for service period selection.
6. **Invoices - Layout** - Linked Jobs and Service Period moved side by side (50/50 on desktop, stacked on mobile).
7. **Invoices - Add all jobs** - Added "Add all (N)" button to link all unlinked jobs from the selected period at once.
8. **Invoices - Job filter** - Job picker now only shows jobs with status "confirmed".
9. **Invoices - PDF download** - Added a download PDF icon button directly in each table row.
10. **Invoices - Table actions** - View and Edit buttons now show icons only (label moved to tooltip).
11. **Invoices - Date filters** - Added Today / This Week / This Month / By Date filter buttons to the invoices toolbar, matching the Jobs page.
12. **Settings - General Page** - Added owner-only General settings page (`/settings/general`) with company info (name, contact email/phone, timezone, default language), address, and branding (logo URL, primary color); Settings now defaults to this page.
13. **Invoices - Branded header** - Invoice form now shows a live preview header (logo + company info on the left, INVOICE title + number + dates + Bill To on the right); same layout applied to all PDF downloads (table row and form button).
14. **Documents - Download** - Added a download button in the actions column of the files table; clicking it fetches the file as a blob and triggers a native browser download with the original filename.
15. **Services - Overtime** - Added optional overtime support: toggle in create/edit modal to enable overtime, with unit selector (`per_hour` / `per_job` / `per_day`) and extra percentage field (0-1000); when enabled, an **OT +X%** badge is shown next to the price in the services list.
16. **Jobs - Overtime Hours** - When the selected service has `overtime.isEnabled`, an "Overtime Hours" input appears in the job form (with the OT badge showing the extra %); value is sent to the backend as `overtimeHours` and loaded back when editing.

## 2026-05-10

1. **Invoices - Send via Email** - Added a "Send Invoice" (paper-plane icon) button in each invoice table row; clicking it opens a send modal pre-filled with the customer's email and name.
2. **Invoices - Send Modal** - `SendModal` component with editable email and recipient-name fields, inline error message, and a spinner/disabled state while the request is in flight; calls `POST /invoices/:id/send` via `invoiceService.send()`.
3. **Invoices - Send re-confirmation** - If the invoice already has status `sent`, a browser-native confirm dialog asks "Invoice already sent. Send again?" before opening the modal.
4. **Invoices - Send toast** - A success toast notification slides in after a successful send, showing "Invoice sent to <email>", and auto-dismisses after 4 seconds.
5. **Invoices - "Sent" status** - Added `sent` as a recognised invoice status with i18n labels (Sent / Enviada / Inviata) in the status badge and filter tab.
6. **Invoices - No-email guard** - If the customer has no email on record, a warning message is shown ("Customer has no email — add one to their profile first") instead of opening the modal.

## 2026-05-11

1. **Invoices - Detail page** - Added `InvoiceDetailPage` (`/invoices/:id`) as a read-only detail view showing all invoice fields, line items table with totals, customer snapshot, payment info, notes, and linked jobs count.
2. **Invoices - View button** - Each invoice row now has a View button that navigates to `/invoices/:id` passing the invoice via router state for instant display (background fetch refreshes from the API).
3. **Invoices - Edit from detail** - The Edit button on the detail page navigates back to `/invoices` with the invoice in router state (`{ editInvoice }`) so the full `InvoiceFormSection` (with send, PDF download, line items, etc.) opens automatically.
4. **Invoices - Menu navigation fix** - Clicking the Invoices menu item from the detail page or while the edit form is open now correctly returns to the invoice table (effect re-runs on `location.key` change and resets form state when no edit intent is present in the navigation state).
5. **Invoices - WhatsApp deep link** - Added a WhatsApp button (green icon) to each invoice table row and on the detail page top bar; clicking it opens WhatsApp (web or app) pre-filled with the customer's phone number and a rich message containing: greeting, invoice number, issue/due dates, itemised list (description, qty × unit price = line total), subtotal, discount, tax, grand total, and notes; if the customer has no phone number, an alert is shown.
