export default async function (page) {
  let dubokuPlayerURLs = ["vidjs.html"];

  // find the right duboku frame
  let frame = page
    .frames()
    .find(
      (frame) =>
        dubokuPlayerURLs.filter(
          (playerUrl) => frame.url().indexOf(playerUrl) >= 0
        ).length > 0
    );

  if (!frame) return;

  console.log("=== Using Duboku handler ===");

  // play video in fullscreen
  const videoSelector = "#playerCnt_html5_api";
  await frame.$eval(videoSelector, (video) => video.play());
  await frame.$eval(videoSelector, (video) => video.requestFullscreen());

  let duration = await frame.$eval(videoSelector, (video) => video.duration);
  let ended = await frame.$eval(videoSelector, (video) => video.ended);

  // get next episode video link
  let nextLinkSelector =
    "body > div.container > div > div.col-lg-wide-75.col-md-wide-7.col-xs-1.padding-0 > div:nth-child(1) > div > div > div.myui-player__item.clearfix > ul > li:nth-child(8) > a";
  let nextLink = await page.$eval(nextLinkSelector, (a) => a.href);
  let nextLinkClass = await page.$eval(nextLinkSelector, (a) => a.className);

  console.log("ended", ended);
  console.log("duration", duration);
  console.log("nextLink", nextLink);

  // go to next episode when video is ended
  if (nextLinkClass != "disabled") {
    await frame.$eval(
      videoSelector,
      (video, next) => {
        video.onended = () => {
          window.playNext(next);
        };
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
