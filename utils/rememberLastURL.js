import fs from "fs";

export default function (url, file) {
  fs.writeFile(file, url, function (err) {
    if (err) {
      return console.log("failed to save last visit url:", err);
    }
    console.log("last visit url is saved");
  });
}
