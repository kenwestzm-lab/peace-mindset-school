# 🕊️ Peace Mindset Private School — Complete Setup Guide
## Better Education · Lusaka, Zambia

---

## ⚠️ FIRST: SECURITY WARNING
Your Cloudinary API Secret has been seen in this chat.
**Go to https://cloudinary.com → Settings → Security → Regenerate API Secret NOW.**
Then use the new secret in your .env file.

---

## 📁 Project Structure
```
peace-mindset/
├── backend/          ← Node.js + Express API
└── frontend/         ← React app (Vite)
```

---

## PHASE 2: STEP-BY-STEP LOCAL SETUP

### Step 1 — Install Required Tools
Download and install these (free):
1. **Node.js**: https://nodejs.org → Download LTS (18 or higher)
2. **Git**: https://git-scm.com → Download for your OS
3. **VS Code**: https://code.visualstudio.com (recommended editor)

Verify in your Terminal / Command Prompt:
```bash
node --version    # Should say v18.x.x or higher
npm --version     # Should say 9.x.x or higher
git --version     # Should say 2.x.x
```

---

### Step 2 — Set Up MongoDB Atlas (FREE database)
1. Go to https://cloud.mongodb.com
2. Click "Try Free" → Sign up with your email
3. Click "Build a Database" → Choose FREE (M0 Sandbox)
4. Select AWS → Choose a region (Africa if available, or Europe)
5. Click "Create Cluster" → Wait 2 minutes
6. Under "Security" → "Database Access" → Add a database user:
   - Username: `peacemindset`
   - Password: Create a strong password (save it!)
   - Role: "Atlas admin"
7. Under "Security" → "Network Access" → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
8. Click "Connect" → "Connect your application" → Copy the connection string
   - It looks like: `mongodb+srv://peacemindset:PASSWORD@cluster0.xxxxx.mongodb.net/`
   - Change `<password>` to your actual password
   - Add `peace-mindset` before the `?`: `...mongodb.net/peace-mindset?retryWrites...`

---

### Step 3 — Set Up Cloudinary (FREE file storage)
1. Go to https://cloudinary.com → Sign up free
2. On your dashboard, find:
   - Cloud Name (e.g., "dxxxxx")
   - API Key
   - API Secret
3. Save all three values

---

### Step 4 — Configure Backend
Open the `backend` folder. Copy `.env.example` to `.env`:
```bash
cd peace-mindset/backend
cp .env.example .env
```

Open `.env` in VS Code and fill in:
```
MONGO_URI=mongodb+srv://peacemindset:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/peace-mindset?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=782948565323317
CLOUDINARY_API_SECRET=YOUR_NEW_SECRET_AFTER_REGENERATING
JWT_SECRET=any_random_string_at_least_50_characters_long_change_this
```

---

### Step 5 — Install and Run Backend
```bash
cd peace-mindset/backend
npm install
npm run dev
```

You should see:
```
✅ MongoDB connected
✅ Admin account created: adminpeacemindset.edu.zm@gmail.com
✅ Developer account created: kenwestzm@gmail.com
✅ Default fee settings created
🚀 Server running on port 5000
```

**If you see an error:**
- MongoDB error → Check your MONGO_URI in .env (no spaces, correct password)
- Port error → Change PORT=5001 in .env

---

### Step 6 — Install and Run Frontend
Open a NEW terminal window:
```bash
cd peace-mindset/frontend
npm install
npm run dev
```

You should see:
```
VITE v5.x.x ready
➜ Local: http://localhost:5173/
```

---

### Step 7 — Test Locally
Open http://localhost:5173 in your browser.

**Test Admin Login:**
- Email: adminpeacemindset.edu.zm@gmail.com
- Password: PeaceMindset@Admin2024!

**Test Developer Login:**
- Email: kenwestzm@gmail.com
- Password: PeaceMindset@Dev2024!

**Test Parent Registration:**
- Click "Create Account"
- Fill in name, email, password
- You should be redirected to the parent dashboard

---

## PHASE 4: DEPLOYMENT (Go Live)

### Deploy Backend to Render (FREE)

1. **Create GitHub account**: https://github.com (if you don't have one)

2. **Push backend to GitHub**:
```bash
cd peace-mindset/backend
git init
git add .
git commit -m "Initial backend"
# Create a repo on github.com called "peace-mindset-backend"
git remote add origin https://github.com/YOUR_USERNAME/peace-mindset-backend.git
git push -u origin main
```

3. **Deploy on Render**:
   - Go to https://render.com → Sign up free
   - Click "New +" → "Web Service"
   - Connect your GitHub → Select `peace-mindset-backend`
   - Settings:
     - Name: `peace-mindset-backend`
     - Runtime: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Click "Advanced" → Add Environment Variables (one by one):
     - `NODE_ENV` = `production`
     - `MONGO_URI` = your full MongoDB connection string
     - `JWT_SECRET` = your random secret
     - `CLOUDINARY_CLOUD_NAME` = your cloud name
     - `CLOUDINARY_API_KEY` = 782948565323317
     - `CLOUDINARY_API_SECRET` = your new secret
     - `ADMIN_EMAIL` = adminpeacemindset.edu.zm@gmail.com
     - `ADMIN_PASSWORD` = PeaceMindset@Admin2024!
     - `DEVELOPER_EMAIL` = kenwestzm@gmail.com
     - `DEVELOPER_PASSWORD` = PeaceMindset@Dev2024!
     - `PLATFORM_FEE_PERCENT` = 5
     - `FRONTEND_URL` = https://your-site.netlify.app (fill after frontend deploy)
     - `AIRTEL_NUMBER` = 0977200127
     - `MTN_NUMBER` = 0960774535
   - Click "Create Web Service"
   - Wait 3-5 minutes. You'll get a URL like: `https://peace-mindset-backend.onrender.com`

4. **Test backend**: Visit `https://peace-mindset-backend.onrender.com/api/health`
   - Should return: `{"status":"ok",...}`

---

### Deploy Frontend to Netlify (FREE)

1. **Update frontend .env**:
```bash
cd peace-mindset/frontend
```
Create `.env` file:
```
VITE_API_URL=https://peace-mindset-backend.onrender.com/api
VITE_SOCKET_URL=https://peace-mindset-backend.onrender.com
```

2. **Build the frontend**:
```bash
npm run build
```
This creates a `dist` folder.

3. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial frontend"
# Create repo "peace-mindset-frontend" on github.com
git remote add origin https://github.com/YOUR_USERNAME/peace-mindset-frontend.git
git push -u origin main
```

4. **Deploy on Netlify**:
   - Go to https://netlify.com → Sign up free
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub → Select `peace-mindset-frontend`
   - Settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"
   - You get a URL like: `https://amazing-name-123456.netlify.app`
   - You can customize this URL under "Domain settings"

5. **Update Render FRONTEND_URL**:
   - Go back to Render → your backend service → Environment
   - Update `FRONTEND_URL` = your Netlify URL
   - Render will redeploy automatically

---

## PHASE 5: GO LIVE TODAY

### First actions after deployment:

**1. Admin: Register a parent's child**
- Login as admin
- Go to "Manage Children" → Click "+ Register Child"
- Enter child name, grade, teacher name, teacher phone
- Select the parent's account (parent must register first)

**2. Parent: Register and make first payment**
- Parent goes to your site → "Create Account"
- After login, parent goes to "Payments"
- Clicks "+ Make Payment"
- Selects their child, payment type (Monthly School Fee = ZMW 150)
- Pays via Airtel Money (0977200127) or MTN (0960774535)
- Enters transaction ID → Submits

**3. Admin: Approve the payment**
- Login as admin
- Go to "Manage Payments"
- Find the pending payment → Click "✓ Approve"
- Parent gets real-time notification
- Parent can now access results

**4. Admin: Upload a result**
- Go to "Manage Children"
- Find the child → Click "📋 Result"
- Fill in title, term, year
- Upload PDF → Submit
- Parent gets notification

---

## PHASE 6: BUSINESS SETUP

### How to onboard parents:
1. Share your Netlify URL with parents
2. Tell parents: "Register with your email, then contact admin to add your child"
3. Parents register themselves → You (admin) add their children

### How to grow:
- Share the link via WhatsApp groups
- Print a simple flyer with the URL and mobile money numbers
- Tell parents to use English or French — their choice

### Keep costs at zero:
- MongoDB Atlas: FREE (500MB — enough for ~50 parents)
- Render free tier: Sleeps after 15 min of inactivity (first request wakes it in ~30 seconds)
- Netlify: FREE (100GB bandwidth)
- Cloudinary: FREE (25GB storage)

### When to upgrade:
- **More than 50 children**: Upgrade MongoDB ($9/month)
- **Faster backend**: Upgrade Render to paid ($7/month)
- **Custom domain**: Buy domain on Namecheap (~$10/year) → Connect to Netlify

---

## ACCOUNTS SUMMARY

| Role | Email | Password |
|------|-------|----------|
| Admin | adminpeacemindset.edu.zm@gmail.com | PeaceMindset@Admin2024! |
| Developer | kenwestzm@gmail.com | PeaceMindset@Dev2024! |
| Parents | Self-register | Their own |

---

## PAYMENT NUMBERS (for parents to send to)

| Provider | Number |
|----------|--------|
| Airtel Money | 0977200127 |
| MTN MoMo | 0960774535 |

---

## FEE STRUCTURE

| Fee Type | Amount |
|----------|--------|
| School Fee (Monthly) | ZMW 150 |
| School Fee (Per Term) | ZMW 450 |
| Test Fee — Baby Class to Grade 5 | ZMW 30 |
| Test Fee — Grade 6 and above | ZMW 40 |
| Event Fees | Set by Admin |

---

## COMMON ERRORS & FIXES

| Error | Fix |
|-------|-----|
| "MongoDB connection failed" | Check MONGO_URI in .env — no spaces, correct password |
| "Cannot GET /api/..." | Backend not running — run `npm run dev` in backend folder |
| Blank page on frontend | Check browser console (F12) — check VITE_API_URL in .env |
| "Invalid token" | Clear localStorage in browser, login again |
| Files not uploading | Check Cloudinary credentials in .env |
| Render backend sleeping | First request wakes it — this is normal on free tier |

---

## SUPPORT
Developer: kenwestzm@gmail.com
