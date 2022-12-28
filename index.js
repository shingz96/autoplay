const { chromium } = require("playwright-chromium");

(async () => {
  const path = require("path");
  const fs = require("fs");

  const pathToExtensions = path.join(__dirname, "extensions");
  let extensionFolders = fs
    .readdirSync(pathToExtensions, {
      withFileTypes: true,
    })
    .filter((file) => file.isDirectory())
    .map((file) => path.join(pathToExtensions, file.name));

  const channel = "msedge";
  const userDataDir = path.join(__dirname, "user-data", channel);
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: channel,
    viewport: null,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--start-maximized",
      "--enable-automation",
      `--disable-extensions-except=${extensionFolders.join(",")}`,
      `--load-extension=${extensionFolders.join(",")}`,
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const [page] = browser.pages();

  await page.exposeFunction("playNext", (nextLink) => {
    console.log("ended", nextLink);
    page.goto(nextLink);
  });
  await page.exposeFunction("exitFullscreen", () => {
    page.evaluate(() => document.exitFullscreen());
  });

  page.on("close", () => {
    console.log("close");
    browser.close();
  });

  page.on("load", async () => {
    console.log(page.url());
    let dubokuPlayerURLs = ["vidjs.html"];
    let frame = page
      .frames()
      .find(
        (frame) =>
          dubokuPlayerURLs.filter(
            (playerUrl) => frame.url().indexOf(playerUrl) >= 0
          ).length > 0
      );

    if (frame) {
      await frame.$eval("#playerCnt_html5_api", (video) => video.play());
      await frame.$eval("#playerCnt_html5_api", (video) =>
        video.requestFullscreen()
      );
      let duration = await frame.$eval(
        "#playerCnt_html5_api",
        (video) => video.duration
      );
      let ended = await frame.$eval(
        "#playerCnt_html5_api",
        (video) => video.ended
      );
      let nextLinkSelector =
        "body > div.container > div > div.col-lg-wide-75.col-md-wide-7.col-xs-1.padding-0 > div:nth-child(1) > div > div > div.myui-player__item.clearfix > ul > li:nth-child(8) > a";
      let nextLink = await page.$eval(nextLinkSelector, (a) => a.href);
      let nextLinkClass = await page.$eval(
        nextLinkSelector,
        (a) => a.className
      );
      console.log(ended, duration, nextLink);

      if (nextLinkClass != "disabled") {
        await frame.$eval(
          "#playerCnt_html5_api",
          (video, next) => {
            video.onended = () => {
              window.playNext(next);
            };
          },
          nextLink
        );
      } else {
        await frame.$eval("#playerCnt_html5_api", (video) => {
          video.onended = () => {
            window.exitFullscreen();
          };
        });
      }
    }
  });

  await page.goto("https://www.duboku.tv");
})();
