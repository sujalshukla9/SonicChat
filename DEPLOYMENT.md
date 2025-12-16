# SonicChat Deployment Guide

## 🚀 Deploy Backend to Render.com

### Step 1: Push Code to GitHub
Make sure your code is pushed to a GitHub repository.

### Step 2: Create Render.com Account
1. Go to [render.com](https://render.com)
2. Sign up/Login with your GitHub account

### Step 3: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the `server` folder as the **Root Directory**
4. Set the following:
   - **Name**: `sschats-backend` (or your choice)
   - **Environment**: `Docker`
   - **Instance Type**: Free (or paid for better performance)

### Step 4: Add Environment Variables
In the Render dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CLIENT_URL` | `https://your-frontend.vercel.app` |
| `FIREBASE_PROJECT_ID` | `your-firebase-project-id` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `{...your JSON...}` |
| `CLOUDINARY_CLOUD_NAME` | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | `your-api-key` |
| `CLOUDINARY_API_SECRET` | `your-api-secret` |
| `GSHEET_SPREADSHEET_ID` | `your-sheet-id` |

### Step 5: Deploy
Click **"Create Web Service"** and wait for the build to complete.

Your backend URL will be: `https://your-app-name.onrender.com`

---

## 🌐 Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Set the **Root Directory** to `client`

### Step 3: Configure Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 4: Add Environment Variables
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

### Step 5: Deploy
Click **"Deploy"** and wait for the build to complete.

Your frontend URL will be: `https://your-app-name.vercel.app`

---

## ⚠️ Important: Update CORS

After deploying both:

1. Go back to **Render.com**
2. Update the `CLIENT_URL` environment variable to your actual Vercel URL
3. The backend will automatically restart

---

## 🔧 Troubleshooting

### WebSocket Connection Issues
Make sure your Render.com service supports WebSocket connections (it does by default).

### CORS Errors
Ensure `CLIENT_URL` on the backend matches your frontend URL exactly (no trailing slash).

### Build Failures
Check the build logs in Render.com/Vercel for specific error messages.
