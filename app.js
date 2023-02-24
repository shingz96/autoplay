import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dubokuHandler from "./web-video-handlers/duboku.js";
import dramaqHandler from "./web-video-handlers/dramaq.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const pathToExtensions = path.join(
  process.env.EXTENSIONS_PATH || __dirname,
  "extensions"
);
const extensionsFolders = fs
  .readdirSync(pathToExtensions, {
    withFileTypes: true,
  })
  .filter((file) => file.isDirectory())
  .map((file) => path.join(pathToExtensions, file.name));
const userDataDir = path.join(
  process.env.USER_DATA_PATH || __dirname,
  "user-data",
  "msedge"
);
console.log("=== Environment Configuration ===");
console.log("* Extension Folder:", extensionsFolders);
console.log("* User Data Folder:", userDataDir);
console.log("* Browser Path:", process.env.BROWSER_PATH);
console.log("=================================");

async function launchBrowser() {
  return puppeteer.launch({
    headless: false,
    executablePath: process.env.BROWSER_PATH,
    defaultViewport: null,
    ignoreDefaultArgs: [
      "--enable-automation",
      "--enable-blink-features=IdleDetection",
    ],
    args: [
      "--disk-cache-size=0",
      "--enable-automation",
      "--disable-sync",
      `--disable-extensions-except=${extensionsFolders.join(",")}`,
      `--load-extension=${extensionsFolders.join(",")}`,
      "--disable-features=IsolateOrigins,site-per-process",
    ],
    userDataDir: userDataDir,
  });
}

async function setupAutoPlayFunctions(page) {
  await page.exposeFunction("log", (...text) => {
    console.log(...text);
  });
  await page.exposeFunction("playNext", (nextLink) => {
    page.goto(nextLink);
  });
  await page.exposeFunction("exitFullscreen", () => {
    page.evaluate(() => document.exitFullscreen());
  });
}

(async () => {
  if (!process.env.BROWSER_PATH) {
    console.error("missing BROWSER_PATH in env");
    return;
  }

  const browser = await launchBrowser();

  browser.on("disconnected", () => {
    if (process.env.CLEAR_USER_DATA_DIR_ON_EXIT) {
      console.log("clearing user data dir:", userDataDir);
      setTimeout(
        () => fs.promises.rm(userDataDir, { recursive: true, force: true }),
        1000
      );
    }
  });

  const [page] = await browser.pages();

  setupAutoPlayFunctions(page);

  page.on("load", async () => {
    console.log("visiting page ->", page.url());

    const LAST_VISIT_URL_FILE = path.join(
      process.env.USER_DATA_PATH || __dirname,
      "LAST_VISIT_URL"
    );
    
    if (page.url().includes(homepage.replace(/\\/gi, "/"))) {
      fs.readFile(LAST_VISIT_URL_FILE, "utf8", async (err, data) => {
        if (!err && data) {
          await page.$eval(
            "ul.list-unstyled",
            (ul, data) => {
              let li = document.createElement("li");
              let link = document.createElement("a");
              link.setAttribute("href", data);
              link.appendChild(
                document.createTextNode("Click here to continue Last Visit")
              );
              li.appendChild(link);
              ul.appendChild(li);
            },
            data
          );
        }
      });
    }

    dubokuHandler(page, { lastVisitURLFile: LAST_VISIT_URL_FILE });

    dramaqHandler(page, { lastVisitURLFile: LAST_VISIT_URL_FILE });
  });

  const homepage = path.join(__dirname, "home", "index.html");
  await page.goto(homepage);
})();
