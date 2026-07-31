# Project Structure

`e:\web dev\Mechlab\mechlab`

- `.env.local`
- `.git/`
- `.gitignore`
- `.next/`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `Project_structure.md`
- `eslint.config.mjs`
- `jsconfig.json`
- `next.config.mjs`
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`

- `app/`
  - `globals.css`
  - `layout.js`
  - `page.js`
  - `api/`
    - `ai-analysis/`
      - `route.js`
    - `buckling/`
      - `route.js`
    - `centrifugl-pump/`
      - `route.js`
    - `heat-transfer/`
      - `route.js`
  - `components/`
    - `ToolInstructions.jsx`
  - `tools/`
    - `beam-buckling/`
      - `page.jsx`
    - `centrifugal-pump/`
      - `page.jsx`
    - `heat-transfer/`
      - `page.jsx`

- `lib/`
  - `buckling.js`
  - `centrifugal-pump.js`
  - `heat-transfer.js`

- `public/`
  - `favicon.ico`
  - `file.svg`
  - `globe.svg`
  - `next.svg`
  - `vercel.svg`
  - `window.svg`

> `node_modules/` is also present in the repository root but is not expanded in this file.
