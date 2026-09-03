# VISHWAS SILK - Deployment Playbook

When asked to "deploy", follow this guide end-to-end. Do NOT ask the user for credentials or server details covered below.

## Infrastructure (already set up)

- **Domain (live site):** `https://manage.vishwassilk.com` (valid Let's Encrypt cert). API base: `https://manage.vishwassilk.com/api`
- **EC2:** `3.110.170.133`, SSH user `ec2-user`, key `C:\Users\moham\Desktop\Coding\VISHWAS SILK\vishwas-silk-key.pem`
- **Security group:** `vishwas-silk-ec2-sg` (id `sg-0059ac11b4ad90366`, region ap-south-1) restricts SSH port 22 to authorized IPs. BEFORE any SSH, authorize the current public IP automatically via AWS CLI (get IP from `https://api.ipify.org`, `aws ec2 authorize-security-group-ingress --group-id sg-0059ac11b4ad90366 --protocol tcp --port 22 --cidr <CURRENT_IP>/32`). AFTER the session, revoke that same rule (`aws ec2 revoke-security-group-ingress ...`). This is fully automated — never ask the user for their IP.
- **App dir on server:** `/home/ec2-user/vishwas_silk` (git repo, branch `main`, pulls from GitHub)
- **Backend:** Express on port 4000, managed by PM2 as `vishwas-silk-api` (`pm2 restart vishwas-silk-api`)
- **Frontend:** React + Vite. Built on the server into `frontend/dist`, served by nginx (`/etc/nginx/conf.d/vishwas-silk.conf`). Rebuild + nginx serves automatically.
- **Database:** AWS RDS `vishwas-silk-db.c5mkseq4iein.ap-south-1.rds.amazonaws.com:5432/vishwas_silk`. Credentials live only in `backend/.env` on the server (gitignored) — never overwrite that file.
- **S3:** bucket `vishwas-silk-frontend` (ap-south-1), configured to redirect all requests to `https://manage.vishwassilk.com/`.
- **AWS CLI creds:** configured in the LOCAL AWS CLI default profile as user `vscoder1` (keys originated from `C:\Users\moham\Desktop\Coding\VISHWAS SILK\vscoder1_accessKeys.csv`). If the local AWS CLI loses its credentials, re-configure from that CSV (`aws configure`). The server has NO AWS creds — S3 sync must run from the local machine.
- **Git:** local repo at `C:\Users\moham\Desktop\Coding\VISHWAS SILK` (branch `main`, remote is GitHub). The user makes code changes; during deploy, the agent commits and pushes them itself, then pulls on the server.
- **Android APK:** Capacitor app at `frontend/android`. Output: `frontend/android/app/build/outputs/apk/debug/vishwassilk-debug.apk`. After every build it MUST be published to `https://vishwassilk.com/vishwassilk.apk` (see step 7) so users always download the latest build.

## Deployment steps (run in order)

1. **Git commit + push (agent does this):** stage the user's changes (`git add -A`), commit with a clear message, `git push origin main`. Only if there are uncommitted changes.
2. **Authorize SSH IP (agent does this):** get current public IP, add `/32` rule to `sg-0059ac11b4ad90366` port 22 via AWS CLI.
3. **Pull changes on server:**
   - `ssh -i <KEY> ec2-user@3.110.170.133 "cd /home/ec2-user/vishwas_silk && git pull"`
4. **Backend (only if `backend/` files changed):**
   - `ssh ... "cd /home/ec2-user/vishwas_silk && npm --prefix backend install && pm2 restart vishwas-silk-api"`
   - Verify: `curl -s -o /dev/null -w '%{http_code}' https://manage.vishwassilk.com/api/health` (or POST `/api/auth/login` returns 401, not 500).
5. **Frontend (only if `frontend/` files changed):**
   - `ssh ... "cd /home/ec2-user/vishwas_silk && npm --prefix frontend run build"`
   - Verify new bundle hash: `curl -s https://manage.vishwassilk.com/ | grep -o 'index-[A-Za-z0-9]*\.js'`
6. **Sync S3 (always after frontend build):**
   - From LOCAL machine: `aws s3 sync frontend/dist s3://vishwas-silk-frontend --delete`
   - Verify S3 redirect intact: `curl -sI http://vishwas-silk-frontend.s3-website.ap-south-1.amazonaws.com/` -> Location `https://manage.vishwassilk.com/`
7. **Android APK (after every frontend change):**
   - Locally: `npm run build` (frontend) then `npx cap sync android` (run from `frontend/`)
   - Build APK: from `frontend/android` run `gradlew.bat assembleDebug --no-daemon`
   - Requires `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` (system Java is too old).
   - Verify the URL inside the new bundle is `https://manage.vishwassilk.com/api`, not the IP.
   - Publish to the download site (ALWAYS — every new build must replace the live APK):
     - `scp -i <KEY> frontend/android/app/build/outputs/apk/debug/vishwassilk-debug.apk ec2-user@3.110.170.133:/home/ec2-user/vishwas-silk-website/vishwassilk.apk`
     - This makes it downloadable at `https://vishwassilk.com/vishwassilk.apk` (marketing site nginx root is `/home/ec2-user/vishwas-silk-website/` on the same EC2).
     - Verify: `curl -sI https://vishwassilk.com/vishwassilk.apk` -> HTTP 200 and Content-Length equals the local APK size; compare MD5 of a downloaded copy if unsure.
   - Keep `/home/ec2-user/vishwas-silk-website/version.json` in sync with the APK (`versionName`, `versionCode`, `downloadUrl`, `releaseNotes`; same file is tracked in the repo root). The Android app reads it via `VITE_APK_VERSION_URL=https://vishwassilk.com/version.json` for in-app update checks.
   - Note: Gradle may report UP-TO-DATE and not rewrite the APK when the web bundle is byte-identical — that's fine; the existing APK already contains the current bundle (verify by inspecting `assets/public/index.html` inside the zip).
8. **Smoke test:**
   - Desktop browser login at `https://manage.vishwassilk.com` (admin username `vishwasadminsilk`)
   - Mobile browser login
   - Android app login
9. **Revoke SSH IP (agent does this):** remove the temporary `/32` rule added in step 2. Never remove the other existing IP rules.

## Gotchas (do not break these)

- `frontend/.env.production` must remain `VITE_API_BASE_URL=https://manage.vishwassilk.com/api` (gitignored; the server copy once drifted to the IP and broke mobile login).
- Never use `https://3.110.170.133/` for the app — it uses a self-signed cert and mobile browsers block it.
- `backend/.env` on the server holds secrets (DB + JWT); never edit or delete it.
- Keep nginx cache headers: `index.html` = `no-cache, no-store, must-revalidate`; hashed assets = immutable long cache.
- Login rate limit: 50 attempts / 15 min per IP.
- Do not revoke the user's permanent SSH access rule; only revoke the temporary IP rule you added.
- NEVER write the actual AWS access key / secret key into this file or any committed file — only reference the CSV path (`vscoder1_accessKeys.csv`). The local AWS CLI already has the keys loaded.

## Accounts (production DB)

- Admin: `vishwasadminsilk` / role `admin`
- Rider: `testrider` / role `rider`
- Customer: `testcustomer`, `testcustomer1` / role `customer`
