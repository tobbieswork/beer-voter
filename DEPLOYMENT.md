# Deployment Guide: Google Compute Engine + DuckDNS

This document serves as a reference for how the `beer-voter` application is currently deployed and how to reproduce or update the deployment in the future.

## Architecture Overview

The application is fully prepared for horizontal scaling but is currently deployed on a single Virtual Machine to minimize costs.

- **Host:** Google Compute Engine (e2-micro, Always Free Tier)
- **Domain:** DuckDNS (Free dynamic DNS)
- **Web Server / Proxy:** Nginx
- **SSL / HTTPS:** Certbot (Let's Encrypt)
- **Process Manager:** PM2 (with `dotenv-cli` for environment variable injection)
- **Database:** Supabase (Relational PostgreSQL) via `StorageAdapter`
- **Message Broker:** Redis Pub/Sub (For scaling WebSockets across multiple Node.js instances)

---

## Step-by-Step Deployment Process

### 1. Provision the Server (Google Cloud Console)
1. Go to Compute Engine -> VM Instances.
2. Create an instance named `beer-vote-server`.
3. **Region:** Must be `us-central1`, `us-east1`, or `us-west1` to qualify for the Always Free Tier.
4. **Machine Type:** `e2-micro`.
5. **Boot Disk:** 10 GB Standard Persistent Disk (Debian).
6. **Firewall:** Check both "Allow HTTP traffic" and "Allow HTTPS traffic".

### 2. Connect the Domain (DuckDNS)
1. Log into [DuckDNS](https://www.duckdns.org/).
2. Create a subdomain (e.g., `beer-vote.duckdns.org`).
3. Point the IP address to the **External IP** of your Google Cloud VM.

### 3. Server Setup & Dependencies
SSH into the Google Cloud VM and install the required software:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx redis-server

# Install PM2 and dotenv-cli globally
sudo npm install -g pm2 dotenv-cli

# Enable and start Redis service
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 4. Application Setup
Clone the repository and install npm packages:

```bash
git clone https://github.com/tobbieswork/beer-voter.git
cd beer-voter
npm install
npm run build
```

Create your `.env` file securely on the server:
```bash
nano .env
```
*Ensure it contains:*
- `VITE_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_ID`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `REDIS_URL=redis://127.0.0.1:6379` (Required for WebSocket Pub/Sub)

### 5. Start the Application with PM2
We use `dotenv-cli` to force PM2 to read the `.env` file when starting the `npm run start` script.

```bash
pm2 start "dotenv -- npm run start" --name "beer-vote"
pm2 save
pm2 startup
```
*Note: If you want to run multiple instances (horizontal scaling) on a larger VM, you can run `pm2 start "dotenv -- npm run start" --name "beer-vote" -i max` and Redis will automatically route the WebSocket messages between them.*

### 6. Configure Nginx Reverse Proxy
Nginx sits in front of the Node app, handling incoming web traffic on port 80 and forwarding it to the Node app on port 3001, while preserving WebSocket upgrade headers.

1. Create a configuration file: `sudo nano /etc/nginx/sites-available/beervote`
2. Add the following configuration (replace `YOUR_DOMAIN`):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

3. Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/beervote /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

### 7. Secure with SSL (HTTPS)
Use Certbot to automatically fetch a free SSL certificate from Let's Encrypt and update your Nginx configuration:

```bash
sudo certbot --nginx -d YOUR_DOMAIN.duckdns.org
```

### 8. Update Google OAuth Origins
Because Google Sign-In strictly requires HTTPS, you must add your new secure domain to Google Cloud Console:
1. Go to APIs & Services -> Credentials.
2. Edit your OAuth 2.0 Client ID.
3. Add `https://YOUR_DOMAIN.duckdns.org` to **Authorized JavaScript origins**.

---

## Troubleshooting

- **Supabase Fallback / Missing Data:** If the app says it is falling back to `db.json`, it means PM2 failed to read the `.env` file. Run `pm2 restart beer-vote` or ensure you used `dotenv-cli` when starting the process.
- **WebSockets Not Syncing:** If you are running multiple instances (e.g. using `pm2 -i max`) and WebSockets aren't syncing across clients, check if `REDIS_URL` is set correctly and that `redis-server` is running on your VM (`sudo systemctl status redis-server`).
- **Viewing Server Logs:** Run `pm2 logs beer-vote` to monitor real-time output from the Node application.
