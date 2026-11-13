#!/usr/bin/env node
// scripts/start-tunnel.js
// Starts Next.js dev server and Cloudflare tunnel (via npm cloudflared package)

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const TUNNEL_PORT = 3001;

// Use the npm cloudflared binary
const binaryPath = path.resolve(__dirname, "../node_modules/.bin/cloudflared");
const binaryCmd = fs.existsSync(binaryPath) ? binaryPath : "npx";
const binaryArgs = fs.existsSync(binaryPath) ? ["tunnel", "--url", `http://localhost:${TUNNEL_PORT}`, "--no-autoupdate"] : ["cloudflared", "tunnel", "--url", `http://localhost:${TUNNEL_PORT}`, "--no-autoupdate"];

function run(cmd, args, label) {
  const proc = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  proc.on("error", (e) => console.error(`[${label}] Error:`, e.message));
  return proc;
}

console.log("=== Bless Books — Auto-start with Cloudflare Tunnel ===");
console.log("Starting Next.js dev server (port 3001)...");
const server = run("npm", ["run", "dev"], "SERVER");

setTimeout(() => {
  console.log("Starting Cloudflare tunnel to localhost:" + TUNNEL_PORT);
  run(binaryCmd, binaryArgs, "TUNNEL");
}, 6000);
