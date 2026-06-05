# Prisma Schema Visualizer

A dynamic, interactive, and beautifully designed graph visualization tool for Prisma database schemas. Instantly turn your `.prisma` files into visual ER diagrams with live code parsing, node dragging, and multi-format exporting.

## ✨ Features

- **Real-Time Parsing:** Paste your Prisma schema code and immediately see the visual representation update.
- **Interactive Canvas:** Pan, zoom, and drag your models across an infinite canvas for perfect layout organization.
- **Detailed Inspector:** Click on any model, field, or enum to view specific details and relationships in the side inspector.
- **Auto-Layout:** Automatically arrange your database models into a pristine rectangular grid to minimize overlap.
- **Preset Schemas:** Comes with built-in templates like Simple Blog, E-Commerce Suite, SaaS Project Tracker, and Social Network Graph to get you started quickly.
- **Smart Exports:** Export your designed schema into multiple formats:
  - `.prisma` source code
  - PostgreSQL `schema.sql` (with enum mappings and foreign keys)
  - TypeScript interfaces (`schema.ts`)
  - Layout JSON to save and restore your node coordinates
- **Dark & Light Mode:** Beautiful, high-contrast themes optimized for extended reading and building.

## 🚀 Quick Start

**Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🛠️ Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)
- **Language:** TypeScript

## 📝 Usage

1. **Write Schema:** Use the left sidebar to type or paste your valid Prisma schema code.
2. **Visualize:** Watch the middle playground automatically render your models as interconnected nodes.
3. **Interact:** Drag nodes around, use the mini-map zoom controls, and click on individual fields to inspect their constraints and relations.
4. **Export:** Click the "Export" button in the sidebar or workspace to download your schema as SQL, TypeScript, Prisma, or save your exact node layout.

## 📄 License

This project is licensed under the Apache 2.0 License.
