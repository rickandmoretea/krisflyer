# UOB KrisFlyer Spend→Miles Optimizer

A fully interactive, customizable web tool to plan your miles accrual and optimize UOB KrisFlyer card usage for BKK→JFK Business Class awards. Built with Next.js, shadcn/ui, framer-motion, recharts, and TypeScript.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the optimizer app.

## Tech Stack
- Next.js (App directory, TypeScript)
- shadcn/ui (Cards, Inputs, Tabs, etc: modern headless UI components)
- recharts (data visualization)
- framer-motion (animations)
- lucide-react (icons)

## Project Structure
- `src/components/Optimizer.tsx` – main app logic/UI
- `src/components/ui/` – shadcn/ui component implementations
- `src/lib/constants.ts` – program logic constants, enums, types
- `src/lib/utils.ts` – reusable number formatting/math utilities

## Customization & Extension
- For additional products or cards, edit `src/lib/constants.ts`
- UI theme: controlled with Tailwind and shadcn config (Zinc palette)

---

Made with ❤️ by YOUR_TEAM (2025)
