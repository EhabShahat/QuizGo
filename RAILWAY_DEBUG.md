# 🚨 Railway Healthcheck Debugging Guide

## 🔍 Step 1: Check Railway Deployment Status

1. **Go to Railway Dashboard**
2. **Click on your app service** (not Redis)
3. **Go to "Deployments" tab**
4. **Look for the latest deployment status:**
   - ✅ **Success** (green) = Good
   - ❌ **Failed** (red) = Check logs
   - 🟡 **Building** (yellow) = Wait

## 🔍 Step 2: Check Railway Logs

1. **Click on the latest deployment**
2. **Scroll through the logs** and look for:
   - `🚀 QuizGo server running on port XXXX` ← Good sign
   - Any **error messages** in red
   - **Port binding issues**
   - **Module not found errors**

## 🔍 Step 3: Test Your Endpoints

Try these URLs in your browser (replace with your Railway URL):

### Basic Health Check
```
https://your-app.railway.app/health
```
**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### Simple Ping
```
https://your-app.railway.app/ping
```
**Expected Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "pong"
}
```

### Readiness Check
```
https://your-app.railway.app/ready
```

## 🛠️ Step 4: Common Issues & Solutions

### Issue 1: "Application failed to respond"
**Cause:** App not starting or wrong port
**Solution:**
1. Check if `PORT` environment variable is set
2. Verify your app listens on `process.env.PORT`
3. Check Railway logs for startup errors

### Issue 2: "Healthcheck timeout"
**Cause:** Health endpoint takes too long to respond
**Solution:**
1. Use the simplified `/health` endpoint
2. Increase healthcheck timeout in `railway.json`
3. Remove slow database checks from health endpoint

### Issue 3: "Module not found"
**Cause:** Missing dependencies or wrong paths
**Solution:**
1. Check `package.json` dependencies
2. Verify file paths are correct
3. Run `npm install` locally to test

### Issue 4: Environment Variables Missing
**Cause:** Required env vars not set in Railway
**Solution:**
1. Go to Railway → Variables tab
2. Add all required environment variables
3. Restart deployment

## 🔧 Step 5: Quick Fixes

### Fix 1: Simplify Health Check
If health check is too complex, use this minimal version:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

### Fix 2: Increase Timeout
Update `railway.json`:
```json
{
  "deploy": {
    "healthcheckTimeout": 300,
    "healthcheckInterval": 30
  }
}
```

### Fix 3: Check Port Configuration
Ensure your server uses Railway's port:
```javascript
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 📋 Debugging Checklist

- [ ] Railway deployment shows "Success" status
- [ ] App URL responds (not 404 or timeout)
- [ ] `/health` endpoint returns 200 OK
- [ ] `/ping` endpoint returns 200 OK
- [ ] Environment variables are set
- [ ] Redis database is added and connected
- [ ] No errors in Railway deployment logs

## 🆘 Emergency Fix

If nothing works, try this minimal server test:

1. **Create a simple test endpoint:**
```javascript
app.get('/test', (req, res) => {
  res.status(200).send('Railway deployment working!');
});
```

2. **Test it:** `https://your-app.railway.app/test`

3. **If this works**, the issue is with your health check logic

## 📞 What to Share for Help

If you need help, share:
1. **Railway deployment logs** (copy/paste the errors)
2. **Your Railway app URL**
3. **Environment variables list** (names only, not values)
4. **What happens when you visit `/health` and `/ping`**

---

**Next Step:** Check your Railway dashboard and try the URLs above!