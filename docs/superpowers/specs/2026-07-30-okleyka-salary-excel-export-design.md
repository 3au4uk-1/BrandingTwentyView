# Okleyka salary — Excel export (Remote DOM)

Date: 2026-07-30  
Status: approved (conversation)

## Problem

«Оклейщики» CSV button throws `a.click is not a function` — Twenty Remote DOM proxies `document.createElement('a')` without `.click()`.

## Design

1. Replace CSV with **`.xlsx`** export.
2. **Logic function** `GET/POST /okleyka-salary-export` builds the workbook (same filters as the page) and returns binary OpenXML.
3. Front: `fetch` + Bearer → `Blob` → Remote-DOM-safe download helper:
   - try `window.open(objectUrl)`
   - else show a real `<a href download>` for a user gesture (no programmatic `createElement().click()`).
4. Filename: `okleyka-salary-YYYY-MM-DD.xlsx`.

## Non-goals

- Sheet sync / cost fill
- Changing salary filters or columns
