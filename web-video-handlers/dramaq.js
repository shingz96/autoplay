import rememberLastURL from "../utils/rememberLastURL.js";

function checkIncludes(tocheck, possibleList) {
  for (let possible of possibleList) {
    if (tocheck.includes(possible)) {
      return true;
    }
  }
  return false;
}

function waitForFrame(page, dramaqHostname) {
  let fulfill;
  const promise = new Promise((x) => (fulfill = x));
  checkFrame();
  return promise;

  function checkFrame() {
    const frame = page
      .frames()
      .find((frame) => frame.url().includes(dramaqHostname));
    if (frame) {
      fulfill(frame);
    } else {
      page.once("framenavigated", checkFrame);
    }
  }
}

export default async function (page, { ...args }) {
  const dramaqNames = ["dramaq", "dramasq", "qdrama"];

  if (
    !checkIncludes(page.url(), dramaqNames) ||
    (await page.$("#video-player")) == null
  ) {
    return;
  }

  console.log("=== Using Dramaq handler ===");

  // skip youtube video source
  await page.$$eval(
    "#episode > div.block > div.sources > div > a",
    (sources) => {
      for (let i = 0; i < sources.length; i++) {
        let source = sources[i];
        if (!source.textContent.toLowerCase().includes("youtube")) {
          window.log(`sources ${i + 1}`, source.textContent);
          source.click();
          break;
        }
      }
      return sources;
    }
  );

  // find the right dramaq frame
  const dramaqHostname =
    (await page.evaluate(() => location.host)) + "/a/m3u8/";

  const frame = await waitForFrame(page, dramaqHostname);
  if (!frame) return;

  rememberLastURL(page.url(), args.lastVisitURLFile);

  // play video in fullscreen
  const videoSelector = "#dplayer > div.dplayer-video-wrap > video";
  await frame.waitForSelector("#dplayer");
  await frame.$eval(videoSelector, (video) => video.play());
  await frame.$eval(videoSelector, (video) => video.requestFullscreen());

  // get next episode video link
  let duration = await frame.$eval(videoSelector, (video) => video.duration);
  let ended = await frame.$eval(videoSelector, (video) => video.ended);
  let nextLink;
  try {
    nextLink = await page.$eval(
      "body > div.main.inner.sizing > div.content.sizing > div.nextep > li > a",
      (a) => a.href
    );
  } catch (error) {}

  console.log("ended", ended);
  console.log("duration", duration);
  console.log("nextLink", nextLink);

  // go to next episode when video is ended
  if (nextLink) {
    await frame.$eval(
      videoSelector,
      (video, next) => {
        video.onended = () => {
          window.playNext(next);
        };
        //   function checkTime() {
        //     if (video.currentTime >= 42 * 60) {
        //       window.playNext(next);
        //     } else {
        //       setTimeout(checkTime, 1000);
        //     }
        //   }
        //   checkTime();
      },
      nextLink
    );
    return;
  }

  // exit fullscreen if no any next episode
  await frame.$eval(videoSelector, (video) => {
    video.onended = () => {
      window.exitFullscreen();
    };
  });
}
