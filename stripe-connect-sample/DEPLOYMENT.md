# Deployment Guide

Deploy the Stripe Connect sample to production with these step-by-step guides.

## Choose Your Platform

- **[Heroku](#heroku)** - Easiest, free tier available, great for beginners
- **[Railway](#railway)** - Modern, simple, GitHub integration
- **[Vercel](#vercel)** - Fast, serverless, git-based deployment
- **[Docker](#docker)** - Any cloud provider (AWS, DigitalOcean, GCP, etc.)

---

## Heroku

The easiest option - deploy in 5 minutes.

### Prerequisites
- Heroku account (free at https://www.heroku.com)
- Heroku CLI installed: https://devcenter.heroku.com/articles/heroku-cli

### Deploy

```bash
# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-stripe-app

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_test_your_key
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_test_your_key
heroku config:set WEBHOOK_SECRET=whsec_your_secret
heroku config:set DOMAIN=https://your-stripe-app.herokuapp.com

# Deploy from Git
git push heroku main

# View logs
heroku logs --tail

# Open the app
heroku open
```

### Set Up Webhooks on Heroku

1. Get your webhook URL:
```bash
heroku apps:info your-stripe-app
# Copy the URL from "Web URL"
```

2. In Stripe Dashboard > Developers > Webhooks:
   - Add endpoint: `https://your-stripe-app.herokuapp.com/webhook`
   - Add endpoint: `https://your-stripe-app.herokuapp.com/webhook/thin` (for V2 events)
   - Copy the signing secrets to `heroku config:set`

### Troubleshooting Heroku

```bash
# View real-time logs
heroku logs --tail

# Check dyno status
heroku ps

# Restart app
heroku restart

# View config
heroku config
```

---

## Railway

Modern alternative with GitHub integration.

### Prerequisites
- Railway account (free at https://railway.app)
- GitHub account

### Deploy

1. **Push code to GitHub** (if not already)
```bash
git push origin main
```

2. **Connect Railway to GitHub:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your repository
   - Select `explorenewfrontiers/public`

3. **Configure environment variables in Railway:**
   - Go to project settings
   - Add variables:
     - `STRIPE_SECRET_KEY` = your secret key
     - `STRIPE_PUBLISHABLE_KEY` = your publishable key
     - `WEBHOOK_SECRET` = your webhook secret
     - `DOMAIN` = your Railway URL
     - `NODE_ENV` = production

4. **Get your URL:**
   - Railway automatically assigns a domain
   - Copy it from the deployment settings

5. **Set up webhooks in Stripe:**
   - Use your Railway URL + `/webhook` and `/webhook/thin`

### Advantages
- Automatic deployments on git push
- GitHub integration
- Simple scaling
- PostgreSQL support if needed

---

## Vercel

Serverless deployment (requires refactoring for serverless).

> **Note**: Vercel works best with serverless functions. The current Express app needs to be restructured. Recommended if you want serverless architecture.

### Prerequisites
- Vercel account (free at https://vercel.com)
- Vercel CLI: `npm install -g vercel`

### Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add WEBHOOK_SECRET
vercel env add DOMAIN

# Re-deploy with environment variables
vercel --prod
```

### Important for Vercel
- This requires converting to serverless functions
- See `vercel.json` configuration below
- Contact me if you want serverless architecture

---

## Docker + Cloud Provider

Deploy using Docker to any cloud provider.

### Prerequisites
- Docker installed locally
- Docker Hub account (free at https://hub.docker.com)
- Cloud provider account (AWS, DigitalOcean, GCP, etc.)

### Step 1: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-username/stripe-connect-sample .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push your-username/stripe-connect-sample
```

### Step 2: Deploy to Your Cloud Provider

#### Option A: AWS EC2

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Docker
sudo yum update
sudo yum install docker
sudo systemctl start docker

# Pull and run the image
docker pull your-username/stripe-connect-sample
docker run -d \
  -p 3000:3000 \
  -e STRIPE_SECRET_KEY=sk_test_your_key \
  -e STRIPE_PUBLISHABLE_KEY=pk_test_your_key \
  -e WEBHOOK_SECRET=whsec_your_secret \
  -e DOMAIN=https://your-domain.com \
  your-username/stripe-connect-sample
```

#### Option B: DigitalOcean App Platform

1. Go to https://www.digitalocean.com/app-platform
2. Click "Create App"
3. Connect your GitHub repository
4. Set build command: `npm run build`
5. Set run command: `npm start`
6. Add environment variables
7. Deploy

#### Option C: Google Cloud Run

```bash
# Set up Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT/stripe-connect

# Deploy to Cloud Run
gcloud run deploy stripe-connect \
  --image gcr.io/YOUR_PROJECT/stripe-connect \
  --platform managed \
  --region us-central1 \
  --set-env-vars STRIPE_SECRET_KEY=sk_test_your_key,STRIPE_PUBLISHABLE_KEY=pk_test_your_key,WEBHOOK_SECRET=whsec_your_secret
```

---

## Environment Variables Checklist

Before deploying anywhere, make sure you have:

- [ ] **STRIPE_SECRET_KEY** - From Stripe Dashboard > Developers > API Keys
- [ ] **STRIPE_PUBLISHABLE_KEY** - From Stripe Dashboard > Developers > API Keys
- [ ] **WEBHOOK_SECRET** - From Stripe Dashboard > Developers > Webhooks
- [ ] **DOMAIN** - Your production domain/URL
- [ ] **PORT** - Usually 3000 (set by platform)

### Get Your Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy the **Secret Key** (sk_test_...)
3. Copy the **Publishable Key** (pk_test_...)
4. Go to https://dashboard.stripe.com/webhooks
5. Create webhooks and copy the signing secrets

---

## Post-Deployment Setup

### 1. Configure Webhooks

In Stripe Dashboard > Developers > Webhooks:

**Create endpoint for standard events:**
- URL: `https://your-domain.com/webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_failed`
- Copy the signing secret

**Create endpoint for V2 events:**
- URL: `https://your-domain.com/webhook/thin`
- Events from: "Connected accounts"
- Payload style: "Thin"
- Events: Select V2 account events
- Copy the signing secret

### 2. Update Environment Variables

Add the webhook secrets to your deployment:

```bash
# Heroku
heroku config:set WEBHOOK_SECRET=whsec_your_secret

# Railway
# Update in project settings

# Other platforms
# Update in environment configuration
```

### 3. Test Webhooks

```bash
# Test locally first
stripe listen --events checkout.session.completed --forward-to localhost:3000/webhook

# Or from your production deployment
curl -X POST https://your-domain.com/webhook \
  -H "stripe-signature: test-sig" \
  -d '{"type":"checkout.session.completed"}'
```

---

## Monitoring & Troubleshooting

### View Logs

**Heroku:**
```bash
heroku logs --tail
```

**Railway:**
- Railway Dashboard > Deployments > View Logs

**Docker:**
```bash
docker logs container-id
```

### Common Issues

**1. "Webhook signature verification failed"**
- Check WEBHOOK_SECRET is correct
- Ensure endpoint URL is exactly right (https://, no trailing slash)

**2. "STRIPE_SECRET_KEY is not set"**
- Verify environment variables are set in deployment platform
- Restart the application after setting variables

**3. "Cannot find module 'express'"**
- Run `npm install` before building
- Check `package.json` is committed to Git

**4. Port conflicts**
- Change PORT environment variable
- Make sure firewall allows the port

---

## Scaling Tips

### For High Traffic

1. **Use a database** - Store accounts and customers
2. **Enable caching** - Cache product lists
3. **Rate limiting** - Prevent abuse
4. **CDN** - Serve static files faster
5. **Load balancing** - Distribute traffic

### For Production

1. **Use live Stripe keys** (not test keys)
2. **Enable HTTPS** (most platforms do this automatically)
3. **Set up monitoring** - Log errors and performance
4. **Backup webhooks** - Store webhook data
5. **Test thoroughly** - Before going live

---

## Recommended: Start with Heroku or Railway

Both are beginner-friendly and have free tiers:

| Platform | Cost | Setup Time | Best For |
|----------|------|-----------|----------|
| Heroku | Free tier available | 5 min | Beginners |
| Railway | $5/month | 5 min | Modern approach |
| Vercel | Free tier | 10 min | Serverless |
| Docker | Cost of cloud provider | 15 min | Advanced |

---

## Need Help?

1. Check platform documentation
2. Review the error logs
3. Test locally with `npm run dev`
4. Verify Stripe webhook configuration
5. Check that all environment variables are set

Good luck! 🚀
