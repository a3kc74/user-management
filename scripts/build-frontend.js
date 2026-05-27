const fs = require("fs");
const path = require("path");

require("dotenv").config();

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const sourceIndex = path.join(rootDir, "index.html");
const targetIndex = path.join(distDir, "index.html");

const apiBaseUrl =
  process.env.FRONTEND_API_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.RENDER_BACKEND_URL ||
  "http://localhost:3001";

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const config = {
  API_BASE_URL: apiBaseUrl.replace(/\/$/, ""),
};

const html = fs
  .readFileSync(sourceIndex, "utf8")
  .replaceAll("__API_BASE_URL__", config.API_BASE_URL);

fs.writeFileSync(targetIndex, html, "utf8");

console.log(`Frontend build created at ${distDir}`);
console.log(`API_BASE_URL=${config.API_BASE_URL}`);
