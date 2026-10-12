# DressBloom — Three-Tier Dress Shopping Application

A beginner-friendly learning project with:
- **Tier 1:** HTML, CSS and JavaScript served by Nginx
- **Tier 2:** Python Flask REST API
- **Tier 3:** MySQL relational database
- **Containers:** Docker and Docker Compose

## Prerequisites

Install Docker Desktop on Windows and ensure Docker Desktop is running.

## Run locally

Open PowerShell or Git Bash in this folder and run:

```bash
docker compose up --build -d
docker compose ps
```

Open **http://localhost:8080** in Chrome. The API health check is at
**http://localhost:8080/api/health**.

To view logs:

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f db
```

To stop containers but keep database data:

```bash
docker compose down
```

To remove containers **and delete the stored database volume** (destructive):

```bash
docker compose down -v
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API/database health |
| GET | `/api/products` | List all products |
| GET | `/api/products?category=Casual` | Filter products |
| GET | `/api/products/1` | Get a product |
| POST | `/api/orders` | Create an order |

Example order request:

```json
{
  "customer_name": "Demo Customer",
  "customer_email": "demo@example.com",
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 2, "quantity": 1}
  ]
}
```

The backend calculates totals from database prices rather than trusting a total sent by the browser.

## Database

The SQL schema and sample products are in `database/init.sql`. MySQL initializes this file only when its data directory is first created. If you change the seed SQL after the volume already exists, you need to apply the SQL manually or reset the volume (which deletes the stored data).

## Troubleshooting

- **Docker command not found:** install/start Docker Desktop, then reopen the terminal.
- **Port 8080 or 5000 already in use:** change the left-hand host port in `docker-compose.yml`.
- **Products do not load:** run `docker compose ps` and `docker compose logs backend db`.
- **Database password changed:** update the matching values for `db` and `backend` in Compose. Existing MySQL volumes may retain the original database user/password.
- **Images do not load:** image URLs require internet access; the app can still be used without them.

## Important security note

This is a portfolio/demo project, not production-ready commerce software. Before real deployment, use Docker secrets or a secret manager instead of sample passwords, restrict CORS, add authentication and authorization, add CSRF/rate limiting as appropriate, use HTTPS, secure headers, backups, migrations, monitoring, and a real payment provider. Do not expose MySQL port 3306 publicly. No payment details are collected here.

## Suggested DevOps extensions

1. Push this repository to GitHub.
2. Add a Jenkins pipeline for checkout, tests, image build, image scan, and deployment.
3. Add tests and SonarQube analysis.
4. Scan the images with Trivy.
5. Deploy to an AWS EC2 host or Kubernetes cluster.
6. Add Prometheus/Grafana monitoring and alerts.
