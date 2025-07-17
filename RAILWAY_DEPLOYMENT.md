# Railway Deployment Guide for QuizGo

## 🚀 Quick Deploy to Railway

### Prerequisites
- GitHub account
- Supabase project set up
- QuizGo code pushed to GitHub

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (free)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your QuizGo repository
6. Railway will automatically detect it's a Node.js project

### Step 2: Add Redis Database

1. In your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add Redis"**
3. Railway automatically creates the Redis instance
4. The `REDIS_URL` environment variable is auto-generated

### Step 3: Configure Environment Variables

In Railway dashboard → **Variables** tab, add these:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Server Configuration
PORT=3001
NODE_ENV=production

# Client URL (add this after deploying frontend)
CLIENT_URL=https://your-frontend.netlify.app

# Redis (automatically provided by Railway)
REDIS_URL=${{Redis.REDIS_URL}}
```

### Step 4: Deploy Backend

1. Railway automatically builds and deploys
2. Wait for deployment to complete
3. Copy your Railway backend URL (e.g., `https://quizgo-backend.railway.app`)

### Step 5: Deploy Frontend to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Set build settings:
   - **Build command**: `cd client && npm run build`
   - **Publish directory**: `client/build`
4. Add environment variables in Netlify:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_API_URL=https://your-railway-backend.railway.app
```

### Step 6: Update CORS Settings

After frontend deployment, update the `CLIENT_URL` in Railway:

```env
CLIENT_URL=https://your-actual-netlify-url.netlify.app
```

## 🎯 Architecture Overview

```
Frontend (Netlify - Free)
├── React Quiz Interface
├── Supabase Realtime
└── API calls to Railway

Backend (Railway - Free $5 credit)
├── Node.js + Express
├── Supabase integration
├── Built-in Redis
└── Real-time features

Database (Supabase - Free)
├── PostgreSQL
├── Realtime subscriptions
├── Auth & Storage
└── Edge Functions
```

## 💰 Cost Breakdown

- **Railway**: $5/month credit (usually covers small apps)
- **Netlify**: Free forever
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Total**: Effectively free for development/demo

## 🔧 Troubleshooting

### Build Fails
- Check Node.js version in `package.json` engines
- Ensure all dependencies are in `dependencies` not `devDependencies`

### Redis Connection Issues
- Verify `REDIS_URL` is set to `${{Redis.REDIS_URL}}`
- Check Redis service is running in Railway dashboard

### CORS Errors
- Update `CLIENT_URL` environment variable
- Ensure frontend URL matches exactly

### Database Connection
- Verify Supabase credentials
- Check database migrations are applied
- Test connection with Supabase dashboard

## 🚀 Going Live Checklist

- [ ] Backend deployed to Railway
- [ ] Redis database added
- [ ] Environment variables configured
- [ ] Frontend deployed to Netlify
- [ ] CORS settings updated
- [ ] Database migrations applied
- [ ] Test game creation and joining
- [ ] Test real-time features

## 📊 Monitoring

Railway provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Deployments**: History and rollback options
- **Usage**: Track your $5 monthly credit

## 🔄 Updates

To update your app:
1. Push changes to GitHub
2. Railway automatically redeploys
3. Netlify automatically rebuilds frontend
4. Zero downtime deployments!

---

**Need help?** Check Railway docs or ask in their Discord community!