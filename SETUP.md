# One-time setup: GitHub Pages + Wix DNS

Follow these steps once. After that, updating the site is just uploading changed files to GitHub.

## Step 1 — Create the repository

1. Sign in at github.com.
2. Click the **+** (top right) → **New repository**.
3. Name it `nyriac.com` (any name works). Leave it **Public** — required for free GitHub Pages.
4. Click **Create repository**.

## Step 2 — Upload this folder

Option A (browser): on the new repo page, click **uploading an existing file**, drag in everything from this folder (including the `css`, `images`, `advisories`, and `tools` folders and the hidden `.nojekyll` file), and click **Commit changes**.

Option B (PowerShell, if an SSH key is set up in GitHub):

```powershell
cd C:\Users\dejac\OneDrive\Cowork\nyriac.com
git init -b main
git add .
git commit -m "Initial RIAC site"
git remote add origin git@github.com:USERNAME/nyriac.com.git
git push -u origin main
```

Replace `USERNAME` with the GitHub username. After this, publishing future edits is just: `git add . ; git commit -m "update" ; git push`

## Step 3 — Turn on GitHub Pages

1. In the repo: **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
3. Under "Custom domain", it should show `nyriac.com` (picked up from the CNAME file). If not, type `nyriac.com` and Save.
4. Wait a few minutes, then tick **Enforce HTTPS** (it appears once the certificate is ready — can take up to a day after DNS is set in Step 4).

## Step 4 — Add DNS records in Wix

In Wix: **Domains** → click `nyriac.com` → **Manage DNS Records** (may be under "Advanced").

**Delete** any existing A records or CNAME on `www` that Wix added, then add:

Four A records (all with Host blank or `@`):

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

One CNAME record:

| Type | Host | Value |
|---|---|---|
| CNAME | www | `YOUR-GITHUB-USERNAME.github.io` |

Replace `YOUR-GITHUB-USERNAME` with the actual GitHub username (lowercase). Example: if the username is `nyriac`, the value is `nyriac.github.io`.

One TXT record, to finish GitHub's **domain verification** (GitHub profile → Settings → Pages → Add a domain, which shows the exact name and code):

| Type | Host | Value |
|---|---|---|
| TXT | `_github-pages-challenge-YOUR-GITHUB-USERNAME` | verification code shown by GitHub |

Verification isn't required for the site to work, but it stops anyone else from claiming `nyriac.com` on GitHub Pages — click **Verify** back on GitHub once the record is saved.

## Step 5 — Verify

- DNS changes take from a few minutes up to 48 hours.
- Visit `https://nyriac.com` — the site should load with a padlock (HTTPS).
- Also check `https://www.nyriac.com` redirects correctly.
- In GitHub **Settings → Pages**, a green check next to the custom domain means everything is working.

Recommended: in GitHub **Settings → Pages**, also click **Verify domain** if offered — it prevents others from claiming nyriac.com on GitHub Pages if the repo is ever deleted.

## Updating the site later

1. Edit the file(s) locally, or open the file on github.com and click the pencil icon.
2. Commit (save) the change on GitHub.
3. The live site updates automatically in about a minute.
