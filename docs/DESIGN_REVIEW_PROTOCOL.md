# Design review protocol

Every AI that designs or reviews a screen uses this checklist. A reviewer reports each failed item as: item number, what is wrong, severity, suggested fix.

## 1. Task fit
1. The screen's main job can be done in the fewest steps (for billing: scan or search, quantity, pay).
2. It matches how the shop actually works, as recorded in shop-visit notes.
3. Wire by the metre, serial capture, price lists and discount limits work where relevant.

## 2. Speed at the counter
4. The whole billing flow works with the keyboard and a USB barcode scanner, no mouse needed.
5. Focus lands in the right field after every action.
6. Search returns results while typing.

## 3. Layout and devices
7. Works on a 1366x768 laptop without horizontal scrolling.
8. Works on a 360 px wide phone; touch targets are at least 44 px.
9. Clear visual hierarchy: the total, the customer and the primary action stand out.

## 4. Components and consistency
10. Uses PrimeNG components and our tokens only; no one-off colours or spacing.
11. Same action looks and is placed the same way on every screen.

## 5. States and errors
12. Loading, empty and error states exist and say what to do next.
13. Destructive actions (cancel bill, delete item) ask for confirmation and a reason.
14. Warnings exist for price above MRP, price below cost, discount above limit, low stock and serial missing.

## 6. Language and numbers
15. All text comes from translation files; Hindi fits without breaking the layout.
16. Amounts use ₹ and lakh/crore grouping; dates are DD/MM/YYYY.
17. Labels are plain shop words, not software jargon.

## 7. Accessibility
18. Text contrast meets WCAG AA.
19. Every input has a visible label; errors are not shown by colour alone.

## 8. Sign-off
20. A shopkeeper has tried the screen (paper print or prototype) and the notes are recorded.
