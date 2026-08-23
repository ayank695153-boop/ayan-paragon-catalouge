# Ayan Paragon Catalogue — fresh build

Features:
- Licence gate before catalogue UI
- Device binding on first activation
- Licence validation on every app load
- Admin page: create, block/unblock, reset device
- 814 unique article codes indexed from the April 2026 catalogue
- Duplicate article codes return all matching catalogue pages
- Original 142-page PDF is served from the same web server
- Opening a result uses `/catalogue.pdf#page=N`, avoiding local file-path/ERR_FILE_NOT_FOUND issues

## Run
1. Install Node.js 18+.
2. `npm install`
3. Set `ADMIN_TOKEN` (and optionally `PORT`).
4. `npm start`
5. App: `/`
6. Admin: `/admin`

Do not expose the admin token in the frontend. Change the default token before deployment.
