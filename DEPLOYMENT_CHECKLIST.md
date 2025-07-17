# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

### Backend Setup
- [x] Health check endpoints added (`/health`, `/ready`, `/ping`)
- [x] Railway configuration files created (`railway.json`, `Procfile`)
- [x] Environment variables identified
- [x] Redis integration ready
- [x] Supabase integration ready

### Database Setup
- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] Realtime enabled for game tables
- [ ] API keys copied

### Railway Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Redis database added
- [ ] Environment variables configured
- [ ] First deployment successful

## 🔧 Railway Configuration Steps

### 1. Add Redis Database
```
Railway Dashboard → New → Database → Add Redis
```

### 2. Environment Variables
Add these in Railway Variables tab:
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
CLIENT_URL=https://your-frontend.netlify.app
REDIS_URL=${{Redis.REDIS_URL}}
```

### 3. Health Check Verification
Your Railway app should respond to:
- `https://your-app.railway.app/health` → Status 200
- `https://your-app.railway.app/ready` → Status 200  
- `https://your-app.railway.app/ping` → Status 200

## 🧪 Testing Your Deployment

### Test API Endpoints
```bash
# Health check
curl https://your-app.railway.app/health

# Create game test
curl -X POST https://your-app.railway.app/api/games/create \
  -H "Content-Type: application/json" \
  -d '{"quizId":"test-quiz-id","hostId":"test-host-id"}'
```

### Test Database Connection
```bash
# Check if Supabase is connected
curl https://your-app.railway.app/health
# Look for "database": "healthy"
```

### Test Redis Connection
```bash
# Check if Redis is connected
curl https://your-app.railway.app/health
# Look for "redis": "healthy"
```

## 🚨 Troubleshooting

### Deployment Fails
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Ensure Node.js version compatibility

### Health Check Fails
1. Check if `/health` endpoint returns 200
2. Verify database connections
3. Check Redis connectivity

### Database Issues
1. Verify Supabase credentials
2. Check if migrations are applied
3. Test connection in Supabase dashboard

### Redis Issues
1. Ensure Redis service is running in Railway
2. Check `REDIS_URL` environment variable
3. Verify Redis connection in health check

## 📊 Success Indicators

### ✅ Deployment Successful When:
- Railway shows "Deployed" status (green)
- Health check returns 200 OK
- All services show "healthy" status
- API endpoints respond correctly
- No error logs in Railway console

### 🎯 Ready for Frontend When:
- Backend URL is accessible
- CORS is configured correctly
- All API endpoints work
- Real-time features are functional

## 🔄 Next Steps After Backend Deployment

1. **Copy your Railway URL** (e.g., `https://quizgo-backend.railway.app`)
2. **Deploy frontend to Netlify**
3. **Update CORS settings** with frontend URL
4. **Test full application flow**
5. **Monitor performance and logs**

---

**Current Status:** Backend deployment in progress...
**Next:** Configure environment variables and test deployment