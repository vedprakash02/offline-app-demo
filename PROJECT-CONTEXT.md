# Project Context

Last updated: 2026-09-22

## Project

- App folder: `offline-app-demo-pkg`
- Frontend: React 19 + Vite
- Desktop packaging: Tauri 2
- Main frontend source: `src/`
- Backend/sidecar folders: `backend id/`, `backend erp/`
- Public templates/assets: `public/`
- Local backend used by attendance screen: `http://localhost:3000`

## Useful Commands

- `npm run dev` - start the local frontend and sidecar workflow
- `npm run dev:frontend` - start only the Vite frontend
- `npm run build` - prepare sidecars and build the frontend
- `npm run lint` - run ESLint
- `npm run preview` - preview the Vite build

Run commands from the `offline-app-demo-pkg` directory.

## Current Feature: Attendance

- Main screen: `src/pages/attendence/Attendence.jsx`
- Styles: `src/pages/attendence/Attendence.css`
- The component is named `ClassAttendance` even though the folder/file uses the spelling `attendence`.
- It reads `activeSession`, `username`, and `token` from `localStorage`.
- It loads students from `GET /all-students` with class, academic session, and search parameters.
- It loads the selected day's records from `GET /attendance`.
- It saves manual records with `POST /student-attendance`.
- Supported statuses are `Present`, `Absent`, and `Late`.
- Default status for an unmarked student is `Absent`.
- The screen supports class selection, date selection, student search, bulk present/absent actions, status buttons, and save.

## Feature: Academic Setup

- Frontend page: `src/pages/academic-subjects/AcademicSubjects.jsx`
- Page styles: `src/pages/academic-subjects/AcademicSubjects.css`
- Dashboard card styles: `src/component/dashboard/AcademicSetupCard.css`
- Dashboard card is above the statistics grid and navigates to `/dashboard/academic-subjects`.
- Frontend API calls use the ERP server at `http://localhost:3000/academic/class-subjects`.
- Backend model: `backend erp/models/classSubject.js`
- Backend routes: `backend erp/routes/academic.js`
- Data is stored in MongoDB per academic session and class; 11th/12th records also use a stream.

## Important Project Notes

- This workspace contains multiple related app packages. Confirm the active package before editing files.
- Preserve existing user changes in the working tree.
- Prefer small, focused edits and run the narrowest relevant validation after changes.
- Keep API routes and localStorage key names consistent with the backend contract.

## Current Work Log

- Academic Setup was added to `offline-app-demo-pkg` using the PHP dashboard page as the reference.
- It supports class selection, senior-class streams, subject add/remove, custom subjects, saved setup listing, and authenticated GET/POST API calls.

## Next Session Handoff

When starting a new chat, say:

> Read `PROJECT-CONTEXT.md` first. Continue the current work in `offline-app-demo-pkg`, especially the attendance screen unless I specify another feature.

Before changing behavior, check the nearby component, its CSS, and the matching backend API route.

## Session Updates

Add dated notes below this line after meaningful changes:

- 2026-09-22: Created the project context file.
- 2026-09-22: Added Academic Setup page, dashboard card, route, MongoDB model, and ERP API. Focused ESLint and `npm.cmd run build` passed.
- 2026-09-22: Added Tauri desktop updater popup/download/relaunch flow. Release setup is documented in `DESKTOP-UPDATES.md`; MilesWeb URL and Tauri public signing key still need to be filled before production release.
- 2026-09-22: GitHub Actions release workflow was added and configured to publish to `vedprakash02/vidya-prabandh-releases`. Secrets were added in GitHub. Releases `v1.0.0`, `v1.0.1`, and `v1.0.2` were attempted; the latest workflow still failed. Next session starts by opening the `v1.0.2` GitHub Actions error log and fixing that failure.
- 2026-09-23: Could not retrieve the private `v1.0.2` Actions log from the current environment. Release workflow now uses tracked-lockfile `npm ci` and retries transient release API/upload failures three times. `npm run lint` passed; verify the next tagged run and confirm `RELEASE_REPO_TOKEN` can write to the public release repository if it still fails.
