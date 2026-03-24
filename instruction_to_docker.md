# Instructions for MongoDB Docker Compose

This file explains how to run the MongoDB database using Docker Compose on Docker Desktop.

## Prerequisites
- **Docker Desktop**: Ensure Docker Desktop is installed and running on your Windows machine. You should see the Docker icon in your system tray.

## 1. Start the Database
Open a terminal in the root of your project (`c:\Users\lasis\Desktop\ProjetCTR`) and run the following command to start MongoDB in the background:

```bash
docker-compose up -d
```

- The `-d` flag runs the container in "detached" mode so you can continue using your terminal.
- Docker will download the official MongoDB image and start the database on port `27017`.

## 2. Verify it's Running
Open **Docker Desktop**. You should see a new container group running called `projetctr` (or simply the folder name), and inside it, a container named `mongodb_projet_ctr`.
Wait until the status symbol shows green (Running).

## 3. Stop the Database (When finished)
When you are done working and want to stop the database, run:
```bash
docker-compose down
```

## Security Note
This MongoDB instance is running locally without a username or password for development speed. It is accessible at `mongodb://localhost:27017/`.
