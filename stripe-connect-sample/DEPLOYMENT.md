# Deployment Guide

Deploy the Stripe Connect sample to production with these step-by-step guides.

## Blockers in this tree (read first)

The deployment files added in this directory assume a `src/` TypeScript layout. The running app is `server.ts` at the sample root.

| Artifact | What the code actually does |
|---|---|
| `tsconfig.json` | `"rootDir": "./src"`, `"include": ["src/**/*"]` — `npm run build` compiles nothing. |
| `package.json` | `start` → `dist/server.js`; `dev` → `src/server.ts` (missing). |
| `Dockerfile` | Builder `COPY src ./src` then `npm run build`. Image build fails without `src/`. |
| `Procfile` | `web: npm run build && npm start` — same broken compile path. |
| `vercel.json` | `functions.api/**/*.ts` and `outputDirectory: dist`. There is no `api/` directory; this is still one Express process. |
| `.github/workflows/deploy.yml` | Lives under `stripe-connect-sample/.github/`. GitHub only runs workflows from the **repository root** `.github/workflows/`. |
| Healthcheck | `node -e "require('http')..."` while `package.json` has `"type": "module"` — `require` is not available in ESM. |

**Before any platform deploy**, either move `server.ts` into `src/server.ts` and keep the existing scripts, or point `tsconfig.json`, npm scripts, and the Dockerfile at the root file. Until then, local `ts-node server.ts` is the only verified start path.

Both webhook routes (`/webhook`, `/webhook/thin`) verify with a single `WEBHOOK_SECRET`. Standard events handled in `server.ts`: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`. Thin events handled: `v2.core.account[requirements].updated`, `v2.core.account[configuration.merchant].capability_status_updated`.

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
- `vercel.json` is not a working Express adapter. It sets `outputDirectory: dist` (static output) and `functions` for `api/**/*.ts`, but those files do not exist.
- Long-lived webhook receivers and `express.raw` body handling do not map 1:1 onto serverless without a rewrite.
- Prefer Heroku, Railway, or Docker until the app is split into functions.

---

## Docker + Cloud Provider

Deploy using Docker to any cloud provider.

`docker-compose.yml` builds this directory, publishes `3000:3000`, and passes `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `WEBHOOK_SECRET`, `DOMAIN`, `PORT`, and `NODE_ENV`. Compose bind-mounts `./dist` over the image `dist/` — if the host `dist/` is empty, the container has no compiled app.

The optional GitHub Actions file tags images as `ghcr.io/<github.repository>/stripe-connect` from context `./stripe-connect-sample`, and a follow-on job deploys to Heroku using `HEROKU_API_KEY`, `HEROKU_APP_NAME`, and `HEROKU_EMAIL`. That workflow is not active unless you copy it to the repo-root `.github/workflows/` directory.

### Prerequisites
- Docker installed locally
- A `src/` layout **or** a Dockerfile rewritten to compile `server.ts` (see blockers above)
- Docker Hub account (free at https://hub.docker.com) if you push public images
- Cloud provider account (AWS, DigitalOcean, GCP, etc.)

### Step 1: Build and Push Docker Image

```bash
# From stripe-connect-sample/ — fails today on COPY src
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
- Events the handler implements: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
- Copy the signing secret into `WEBHOOK_SECRET`

**Create endpoint for V2 events:**
- URL: `https://your-domain.com/webhook/thin`
- Events from: "Connected accounts"
- Payload style: "Thin"
- Events the handler implements: `v2.core.account[requirements].updated`, `v2.core.account[configuration.merchant].capability_status_updated`
- This sample reuses `WEBHOOK_SECRET`; a second Dashboard secret is not read unless you add another env var

Do not subscribe only to `checkout.session.completed` / `checkout.session.async_payment_failed` — those types are not handled in `server.ts` (they would hit the default `Unhandled event type` log).

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
# Test locally (events the handler implements)
stripe listen --events customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded --forward-to localhost:3000/webhook

# Unsigned curl will fail constructEvent (400). Use the CLI or the Dashboard "Send test webhook".
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
