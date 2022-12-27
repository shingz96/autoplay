import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dubokuHandler from "./web-video-handlers/duboku.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  dotenv.config();

  if (!process.env.BROWSER_PATH) {
    console.error("missing BROWSER_PATH in env");
    return;
  }

  const pathToExtensions = path.join(__dirname, "extensions");
  let extensionsFolders = fs
    .readdirSync(pathToExtensions, {
      withFileTypes: true,
    })
    .filter((file) => file.isDirectory())
    .map((file) => path.join(pathToExtensions, file.name));

  const userDataDir = path.join(__dirname, "user-data", "msedge");
  const browserPath = process.env.BROWSER_PATH;
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: browserPath,
    defaultViewport: null,
    ignoreDefaultArgs: [
      "--enable-automation",
      "--enable-blink-features=IdleDetection",
    ],
    args: [
      "--enable-automation",
      "--disable-sync",
      `--disable-extensions-except=${extensionsFolders.join(",")}`,
      `--load-extension=${extensionsFolders.join(",")}`,
      "--disable-features=IsolateOrigins,site-per-process",
    ],
    userDataDir: userDataDir,
  });

  const [page] = await browser.pages();
  await page.exposeFunction("log", (text) => {
    console.log(text);
  });
  await page.exposeFunction("playNext", (nextLink) => {
    console.log("ended", nextLink);
    page.goto(nextLink);
  });
  await page.exposeFunction("exitFullscreen", () => {
    page.evaluate(() => document.exitFullscreen());
  });

  page.on("load", async () => {
    console.log("visiting page ->", page.url());

    dubokuHandler(page);

    //dramaq
    let dramaqNames = ["dramaq", "dramasq", "qdrama"];
    function checkIncludes(tocheck, possibleList) {
      for (let possible of possibleList) {
        if (tocheck.includes(possible)) {
          return true;
        }
      }
      return false;
    }

    if (
      checkIncludes(page.url(), dramaqNames) &&
      (await page.$("#video-player")) !== null
    ) {
      console.log("dramaq is here");
      await page.$eval(
        "#episode > div.block > div.sources > div",
        (rawSources) => {
          let sources = rawSources.children;
          console.log("sources", sources);
          for (let i = 1; i < sources.length; i++) {
            console.log(i, "sources", sources.item(i));

            if (!sources.item(i).textContent.includes("Youtube") && i >= 4) {
              sources.item(i).click();
              break;
            }
          }
        }
      );

      const aHandle = await page.evaluateHandle(() => document.location);
      const resultHandle = await page.evaluateHandle(
        (location) => location.host,
        aHandle
      );
      let dramaqHostname = (await resultHandle.jsonValue()) + "/a/m3u8/";
      await resultHandle.dispose();

      console.log(dramaqHostname);

      let frame = null;
      for (let i = 0; i < page.frames().length; i++) {
        let iframe = page.frames()[i];
        const aHandle = await iframe.evaluateHandle(() => document.location);
        const resultHandle = await iframe.evaluateHandle(
          (location) => location.host,
          aHandle
        );
        console.log("a", iframe.url());
        if (iframe.url().includes(dramaqHostname)) {
          frame = iframe;
        }
        await resultHandle.dispose();
        if (frame) {
          break;
        }
      }

      //let frame = page.frames().find(frame => frame.url().includes(dramaqHostname));
      if (frame) {
        console.log("inframe");
        await page.waitFor(2000);

        await frame.$eval(
          "#dplayer > div.dplayer-video-wrap > video",
          (video) => video.play()
        );
        await frame.$eval(
          "#dplayer > div.dplayer-video-wrap > video",
          (video) => video.requestFullscreen()
        );
        let duration = await frame.$eval(
          "#dplayer > div.dplayer-video-wrap > video",
          (video) => video.duration
        );
        let ended = await frame.$eval(
          "#dplayer > div.dplayer-video-wrap > video",
          (video) => video.ended
        );

        if (
          (await page.$(
            "body > div.main.inner.sizing > div.content.sizing > div.nextep"
          )) !== null
        ) {
          let nextLink = await page.$eval(
            "body > div.main.inner.sizing > div.content.sizing > div.nextep > li > a",
            (a) => a.href
          );
          console.log(ended, duration, nextLink);
          await frame.$eval(
            "#dplayer > div.dplayer-video-wrap > video",
            (video, next) => {
              video.onended = () => {
                window.playNext(next);
                // window.log(video);
              };
              function checkTime() {
                if (video.currentTime >= 42 * 60) {
                  window.playNext(next);
                } else {
                  setTimeout(checkTime, 1000);
                }
              }
              checkTime();
            },
            nextLink
          );
        } else {
          await frame.$eval(
            "#dplayer > div.dplayer-video-wrap > video",
            (video) => {
              video.onended = () => {
                window.exitFullscreen();
                // window.log(video);
              };
            }
          );
        }
      } else {
        console.log("Not dramaq Video");
      }
    }

    //repian123
    if (page.url().includes("://www.repian123.com")) {
      console.log("repian123");

      try {
        await page.waitForSelector("#my-video_html5_api", { timeout: 5000 });
        await page.$eval("#my-video_html5_api", (video) => video.play());
        await page.$eval("#my-video_html5_api", (video) =>
          video.requestFullscreen()
        );
        let duration = await page.$eval(
          "#my-video_html5_api",
          (video) => video.duration
        );
        let ended = await page.$eval(
          "#my-video_html5_api",
          (video) => video.ended
        );
        let nextLinkSelector = "#ff-next";
        let nextLink = await page.$eval(nextLinkSelector, (a) => a.href);
        let nextLinkClass = await page.$eval(
          nextLinkSelector,
          (a) => a.className
        );
        console.log(ended, duration, nextLink);

        if (nextLinkClass != "disabled") {
          await page.$eval(
            "#my-video_html5_api",
            (video, next) => {
              video.onended = () => {
                window.playNext(next);
                // window.log(video);
              };
            },
            nextLink
          );
        } else {
          await frame.$eval("#my-video_html5_api", (video) => {
            video.onended = () => {
              window.exitFullscreen();
              // window.log(video);
            };
          });
        }
      } catch {
        console.log("not found");
      }
    }

    //149mov https://www.149mov.com/vod-play-id- $('#cms_player')
    if (page.url().includes("://www.149mov.com/vod-play-id")) {
      console.log("149mov");
      console.log("1", page.frames().length);

      console.log("main", page.mainFrame().url());
      console.log(
        "main",
        page.frames()[0].url(),
        page.mainFrame() == page.frames()[0]
      );

      // dumpFrameTree(page.mainFrame(), '');

      // function dumpFrameTree(frame, indent) {
      //   console.log(indent + frame.url());
      //   for (const child of frame.childFrames()) {
      //     dumpFrameTree(child, indent + '  ');
      //   }
      // }

      let mov149Frame = null;
      //const requestPerFrame = new Map();
      // page.on('request', request => {
      //   //console.log(page.url(), request.url());
      //   if(request.isNavigationRequest() && request.url().includes('https://api.17365i.com/Aliplayer/Aliplayer.html?videourl=') ){
      //     requestPerFrame.set(request.frame(), request);
      //     mov149Frame = request.frame();

      //     console.log('rmain', page.mainFrame().url());
      //     console.log('r1', page.frames()[0].url(), page.mainFrame() == page.frames()[0] )
      //     console.log('r2', page.frames()[1].url(), mov149Frame == page.frames()[1] );
      //   }
      // });
      await page.waitFor(5000);

      let frame = page
        .frames()
        .find((frame) =>
          frame
            .url()
            .includes(
              "https://api.17365i.com/Aliplayer/Aliplayer.html?videourl="
            )
        );
      if (frame) {
        let videoSelector = "#player-con > video";
        let nextLinkSelector = "#ff-next";
        await frame.$eval(videoSelector, (video) => video.play());
        await page.waitFor(5000);
        await frame.$eval(videoSelector, (video) => video.requestFullscreen());
        let duration = await frame.$eval(
          videoSelector,
          (video) => video.duration
        );
        let ended = await frame.$eval(videoSelector, (video) => video.ended);
        let nextLink = await page.$eval(nextLinkSelector, (a) => a.href);
        let nextLinkClass = await page.$eval(
          nextLinkSelector,
          (a) => a.className
        );
        console.log(ended, duration, nextLink, nextLinkClass);

        if (nextLinkClass != "disabled") {
          await frame.$eval(
            videoSelector,
            (video, next) => {
              video.onended = () => {
                window.playNext(next);
                // window.log(video);
              };
              function checkTime() {
                if (video.currentTime >= 1320) {
                  window.playNext(next);
                } else {
                  setTimeout(checkTime, 1000);
                }
              }
              checkTime();
            },
            nextLink
          );
        } else {
          await frame.$eval(videoSelector, (video) => {
            video.onended = () => {
              window.exitFullscreen();
              // window.log(video);
            };
          });
        }
      }

      console.log("w", page.frames().length);
      console.log("f", mov149Frame == null);

      //await page.waitForSelector('#cms_player');
      console.log("h", page.frames()[1].url());

      // await mov149Frame.$eval('#player-con > video', video => video.play());
      // await page.waitFor(5000);
      // await mov149Frame.$eval('#player-con > video', video => video.requestFullscreen());
      // let duration = await mov149Frame.$eval('#player-con > video', video => video.duration);
      // let ended = await mov149Frame.$eval('#player-con > video', video => video.ended);
      // console.log('d', duration, ended);
      // const frameNavigationResponse = requestPerFrame.get(someFrame).response();
    }
  });
  const homepage = path.join(__dirname, "home", "index.html");
  await page.goto(homepage);
})();
