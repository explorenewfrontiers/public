# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment ✓

- [ ] Code is committed and pushed to `main` branch
- [ ] All tests pass locally: `npm run build`
- [ ] No console errors in local testing
- [ ] `.env` file is NOT committed (only `.env.example`)
- [ ] Dependencies are up to date: `npm install`

## Stripe Setup ✓

### API Keys
- [ ] Have Stripe test keys ready (from https://dashboard.stripe.com/apikeys)
- [ ] Secret Key: `sk_test_...`
- [ ] Publishable Key: `pk_test_...`
- [ ] Know where to get live keys when ready

### Webhooks
- [ ] Created webhook endpoint for standard events
  - [ ] URL set to production domain + `/webhook`
  - [ ] Events: `checkout.session.completed`, `checkout.session.async_payment_failed`
  - [ ] Have signing secret: `whsec_...`
- [ ] Created webhook endpoint for V2 events
  - [ ] URL set to production domain + `/webhook/thin`
  - [ ] Payload style: "Thin"
  - [ ] Events from: "Connected accounts"
  - [ ] Have signing secret

## Platform Selection ✓

Choose ONE:
- [ ] **Heroku** - Easiest for beginners
  - [ ] Have Heroku account
  - [ ] Have Heroku CLI installed
  - [ ] Know your app name
- [ ] **Railway** - Modern alternative
  - [ ] Have Railway account
  - [ ] Repository connected to GitHub
- [ ] **Docker** - For any cloud provider
  - [ ] Docker Hub account (if pushing images)
  - [ ] Cloud provider account (AWS/GCP/etc.)
- [ ] **Vercel** - Serverless (requires refactoring)
  - [ ] Have Vercel account
  - [ ] Read Vercel limitations section

## Environment Variables ✓

All of these set on your deployment platform:

```
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
WEBHOOK_SECRET=whsec_your_secret
DOMAIN=https://your-domain.com
NODE_ENV=production
PORT=3000
```

- [ ] STRIPE_SECRET_KEY is set
- [ ] STRIPE_PUBLISHABLE_KEY is set
- [ ] WEBHOOK_SECRET is set
- [ ] DOMAIN is correct (with https://)
- [ ] NODE_ENV=production

## Deployment ✓

### Heroku
- [ ] Created Heroku app
- [ ] Set all environment variables
- [ ] Deployed with `git push heroku main`
- [ ] Checked logs with `heroku logs --tail`
- [ ] Opened app with `heroku open`
- [ ] App loads without errors

### Railway
- [ ] Connected GitHub repository
- [ ] Set all environment variables in Railway dashboard
- [ ] Deployment started automatically
- [ ] Checked deployment logs
- [ ] Got production URL
- [ ] App loads without errors

### Docker
- [ ] Built Docker image: `docker build -t app .`
- [ ] Tested locally: `docker run -p 3000:3000 app`
- [ ] Pushed to registry (Docker Hub/GCR)
- [ ] Deployed to cloud provider
- [ ] Checked logs
- [ ] App loads without errors

## Post-Deployment ✓

- [ ] App is accessible at your domain
- [ ] Homepage loads (http://your-domain.com)
- [ ] API endpoints respond (try creating an account)
- [ ] No 404 errors for static files
- [ ] HTTPS is working (green lock icon)
- [ ] Stripe keys are correct (not test keys mixed with live)

## Webhook Testing ✓

- [ ] Webhook endpoint is accessible
- [ ] Webhook signatures verify correctly
- [ ] Test event received and logged
- [ ] Production domain matches Stripe webhook URL exactly

## Monitoring ✓

- [ ] Set up error logging (check platform logs)
- [ ] Monitor application performance
- [ ] Check Stripe Dashboard for failed requests
- [ ] Review webhook delivery status in Stripe

## Security ✓

- [ ] Secret keys are NOT in source code
- [ ] Environment variables are set on platform (not in .env file)
- [ ] HTTPS is enabled
- [ ] Webhook secret is set (prevents unauthorized requests)
- [ ] No API keys exposed in error messages
- [ ] Rate limiting considered for production scale

## Database (When Ready) ✓

When you add a database:
- [ ] Database is created and accessible
- [ ] Connection string is set as environment variable
- [ ] Migrations have run
- [ ] Backups are configured

## Going Live with Real Stripe Keys ✓

Only do this after testing with test keys:
- [ ] Tested everything with test Stripe keys
- [ ] Created Stripe live keys (https://dashboard.stripe.com/apikeys)
- [ ] Updated STRIPE_SECRET_KEY to live key (sk_live_...)
- [ ] Updated STRIPE_PUBLISHABLE_KEY to live key (pk_live_...)
- [ ] Updated webhook secrets to live webhooks
- [ ] Test payment processed successfully with real card
- [ ] Verified funds appear in Stripe account
- [ ] Monitor closely for first week

## Troubleshooting ✓

If something breaks:
- [ ] Check platform logs
- [ ] Verify all environment variables are set
- [ ] Test locally first: `npm run dev`
- [ ] Check Stripe dashboard for errors
- [ ] Review webhook delivery history
- [ ] Check domain DNS is correct
- [ ] Verify SSL certificate is valid

## Rollback Plan ✓

If you need to rollback:
- [ ] Know how to revert to previous deployment
  - Heroku: `git push heroku main` (with previous commit)
  - Railway: Click "Redeploy" on previous deployment
  - Docker: Push previous image tag
- [ ] Have backup of webhook events
- [ ] Know how to disable webhooks temporarily

## Sign-Off ✓

- [ ] Application owner has tested
- [ ] No known bugs or issues
- [ ] Ready for customer use
- [ ] Monitoring is active
- [ ] Team knows how to respond to issues

---

## Quick Links

- **Stripe Dashboard**: https://dashboard.stripe.com
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Heroku Dashboard**: https://dashboard.heroku.com
- **Railway Dashboard**: https://railway.app
- **Stripe Docs**: https://docs.stripe.com

## Notes

Use this space for deployment-specific notes:

```
Date deployed: ___________
Platform: ___________
URL: ___________
Issues encountered: ___________
Contact person: ___________
```
