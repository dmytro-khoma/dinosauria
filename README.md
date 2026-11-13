# Dinosauria — a field guide to 30 dinosaurs

A catalogue page with search, filters and a detail view for each dinosaur.
Plain HTML, CSS and JavaScript, no libraries and no build step.

## Open it

Double-click `index.html`, or serve the folder:

```bash
python -m http.server 8003
```

## Features

- **Search** by name, name meaning, region, group or diet. Matches are
  highlighted. Press `/` to jump to the search box.
- **Filters:** period (click the timeline bands), diet chips, group,
  region and a maximum-length slider. Active filters show as pills that
  can be removed one by one.
- **Sorting:** name, oldest, youngest, longest, heaviest.
- **Shareable URLs:** filters are saved in the address, e.g.
  `?period=jurassic&diet=carnivore&sort=longest`.
- **Mesozoic timeline:** every dot is a dinosaur, placed by age; dots fade
  when the dinosaur is filtered out.
- **Detail dialog** (native `<dialog>`): facts, size compared with a
  person, image credit, ← → to move between dinosaurs.
- Light and dark themes from the system setting, View Transitions when
  the list changes, `prefers-reduced-motion` respected.

## Files

```
index.html
assets/css/styles.css   all styles, commented by section
assets/js/app.js        filters, search, rendering, dialog
assets/js/data.js       generated data (do not edit by hand)
assets/img/*.webp       photos, 800 px wide, ~60 KB each
tools/build_data.py     facts + credits -> data.js
```

To change a fact, edit `FACTS` in `tools/build_data.py` and run it again.

## Images

All photos come from Wikimedia Commons under free licences
(CC BY, CC BY-SA or public domain). Each author and licence is listed in
the "Image credits" section at the bottom of the page and in the detail
view. The CC BY-SA licences require keeping that credit visible.

Sizes and dates are rounded textbook values; different sources give
different numbers.
