# 🚀 Manual Cloud Deployment Guide (Hospital360)

This document provides a click-through step-by-step runbook for deploying the **Hospital360** application to the cloud using manual platform dashboards. No CLI/CI deployment configuration files are needed.

---

## 📋 Required Dashboard Environment Variables

### 1. Backend Service (Railway / Render)
| Env Var Name | Source / Example Value | Description |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | Neon / Supabase Connection String | PostgreSQL database connection string. |
| **`JWT_SECRET`** | Custom random string | Secret key for signing and verifying JSON Web Tokens (JWT). |
| **`PORT`** | `process.env.PORT` (automatically set by Railway/Render, or set to `4000`) | Network port for backend HTTP & Socket.io server. |

### 2. Frontend Project (Vercel)
| Env Var Name | Source / Example Value | Description |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_API_URL`** | Deployed Backend Service URL (e.g. `https://hospital360-backend.up.railway.app`) | Address of your deployed Express API. |
| **`NEXT_PUBLIC_SOCKET_URL`** | Deployed Backend Service URL (e.g. `https://hospital360-backend.up.railway.app`) | Address of your deployed Socket.io gateway. |

---

## 🗺️ Step-by-Step Runbook

### Step 1: Create a PostgreSQL Database
1. Go to [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/) and register a free account.
2. Create a new project/database.
3. Once created, copy the connection string. It should look like:
   `postgresql://username:password@hostname/dbname?sslmode=require`
4. Set this connection string aside as your `DATABASE_URL`.

### Step 2: Deploy the Backend Service (Railway or Render)
1. Log in to [Railway](https://railway.app/) or [Render](https://render.com/).
2. Create a new Web Service and link your GitHub repository.
3. Configure the Root Directory / Build Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build` (which runs `tsc` to compile TypeScript to Javascript in `dist/`)
   - **Start Command**: `npm start` (which runs `node dist/server/index.js`)
4. In the service's **Environment Variables** (or **Variables**) dashboard, add:
   - `DATABASE_URL`: *(Your Postgres connection string)*
   - `JWT_SECRET`: *(A long, secure random string)*
5. Save changes. The service will build and start listening on the port provided by the platform. Note the public URL generated (e.g. `https://your-backend.up.railway.app`).

### Step 3: Run Database Migrations
Prisma needs to initialize your PostgreSQL tables. Run this single terminal command from the `backend/` directory of your local workspace pointing to the live URL, or run it in a terminal where you've cloned the project:

```bash
# Set database URL environment variable locally for migration run
DATABASE_URL="your-neon-or-supabase-connection-string" npx prisma migrate deploy
```
*Note: Make sure to replace `your-neon-or-supabase-connection-string` with the actual Postgres connection string.*

### Step 4: Deploy the Frontend Project (Vercel)
1. Log in to [Vercel](https://vercel.com/).
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
4. In the **Environment Variables** dashboard of the Vercel project, add:
   - `NEXT_PUBLIC_API_URL`: *(Your deployed backend URL from Step 2, e.g., `https://your-backend.up.railway.app`)*
   - `NEXT_PUBLIC_SOCKET_URL`: *(Your deployed backend URL from Step 2, e.g., `https://your-backend.up.railway.app`)*
5. Click **Deploy**. Vercel will build and host the Next.js client.

---

## 🔍 How to Verify the Deployment

1. **Verify Database Connection & API Health**:
   - Open your backend URL followed by `/health` in a browser (e.g., `https://your-backend.up.railway.app/health`).
   - You should see a JSON response: `{"status":"healthy","timestamp":"..."}`.

2. **Verify Client Render**:
   - Open the Vercel-generated frontend URL.
   - You should be redirected to the login page (`/login`) or receptionist console (`/receptionist`).

3. **Verify Socket connection**:
   - Look at the top-right corner of the global dashboard header.
   - Check the connection indicator:
     - **Green indicator + "Kernel Connected"**: The frontend has successfully connected to the deployed backend's Socket.io emitter.
     - **Red indicator + "Kernel Halted"**: Check the backend URL configurations or browser console for socket connection or CORS errors.
