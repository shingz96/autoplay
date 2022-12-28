# 📔Description

This is just a simple nodejs application to automatically play the next episode from a website in a browser by using [Puppeteer Library](https://github.com/puppeteer/puppeteer) (in headed mode).

# 🧰 Prerequisite
- NodeJS environment ready
- Brain 🧠 & Hands ✋

# Installation & Usage
1. Clone the github repo and go to the directory
2. Install the needed NPM packages
   ```
   npm install
   ```
3. Configure the environment (refer [here](#⚙️-environment-configurations))
4. Run the command below to open the browser and voila enjoy 🤞
    ```
    node app.js
    ```
    PS: Alternatively, you may run the window script [here](bin/win.bat) by just double click on it

# 💻Supported autoplay website
- [Duboku](https://www.duboku.tv/)
- [Dramaq](https://dramasq.com)

# 🌐 Supported browsers

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge                                                                                                                                                                                                  | last 2 versions                                                                                                                                                                                               |

PS: any chromium based browsers should work (but not 100% guaranteed :see_no_evil:)

# ⚙️ Environment Configurations
- environment can be configured using `.env` file, can refer [.env-sample](.env-sample)

| Properties                  | Usage                                                                                                                                               | Required / Optional |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| BROWSER_PATH                | Path to the browser executable binary                                                                                                               | Required            |
| USER_DATA_PATH              | Path to store the `user-data` directory (no need to include the `user-data`), by default it will be stored in current app directory if not provided | Optional            |
| CLEAR_USER_DATA_DIR_ON_EXIT | Flag to delete the whole `user-data` folders when closing the app, by default it will not delete the `user-data` folders                            | Optional            |
