# PrisV: Prisma Schema Visualizer

A dynamic, interactive, and beautifully designed graph visualization tool for Prisma database schemas. Instantly turn your `.prisma` files into visual ER diagrams with live code parsing, node dragging, and multi-format exporting.
<p>
<p align="right">
  <a href="https://prisma-schema-visualizer.vercel.app/">LIVE Project</a>
</p>

<img width="1400" height="858" alt="Screenshot 2026-06-05 at 5 10 09 pm" src="https://github.com/user-attachments/assets/8e8fd6e0-3db9-4576-9df1-c80b16fa5e0c" />

</p>

## ✨ Features

- **Real-Time Parsing:** Paste your Prisma schema code and immediately see the visual representation update.
- **Interactive Canvas:** Pan, zoom, and drag your models across an infinite canvas for perfect layout organization.
- **Detailed Inspector:** Click on any model, field, or enum to view specific details and relationships in the side inspector.
- **Auto-Layout:** Automatically arrange your database models into a pristine rectangular grid to minimize overlap.
- **Smart Exports:** Export your designed schema into multiple formats:
  - `.prisma` source code
  - PostgreSQL `schema.sql` (with enum mappings and foreign keys)
  - TypeScript interfaces (`schema.ts`)
  - Layout JSON to save and restore your node coordinates
- **Dark & Light Mode:** Beautiful, high-contrast themes optimized for extended reading and building.
