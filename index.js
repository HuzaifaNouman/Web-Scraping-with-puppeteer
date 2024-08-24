import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { json2csv } from "json-2-csv";
import fs from "fs";

puppeteer.use(StealthPlugin());

let loginUrl = "https://www.searchfunder.com/auth/login";
let targetUrl = "https://www.searchfunder.com/searchfund/mysearchfund"; // change the url for scraping investors or searchers accordingly

// Credentials
const email = "asadujan@gmail.com";
const password = "Demo5911";

const randomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const scrapWeb = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1000,
  });

  let allProfiles = []; // all the data after scraping

  try {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 11; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
    ];

    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(userAgent);

    // Navigate to the login page
    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Random delay to mimic human behavior
    await sleep(randomDelay(1000, 3000));

    // Enter login credentials
    await page.type('input[name="email"]', email);
    await sleep(randomDelay(500, 1500));
    await page.type('input[name="password"]', password);
    await sleep(randomDelay(500, 1500));
    await page.click('button[type="submit"]');

    // Random delay before navigating to the target URL
    await sleep(randomDelay(3000, 7000));

    // Navigate to the user list page
    await page.goto(targetUrl, {
      waitUntil: "load",
      timeout: 60000,
    });

    await page.waitForSelector(".grid-table .list tr", {
      visible: true,
      timeout: 120000,
    });

    // Handling HTTP status code 429
    page.on("response", async (response) => {
      if (response.status() === 429) {
        console.log(
          "status code 429 Too Many Requests - Terminating the script."
        );
        await browser.close();
        process.exit(1); // Exit the script entirely
      }
    });

    // Select the region to United States
    if (targetUrl === "https://www.searchfunder.com/user/list/searcher") {
      await page.waitForSelector('div[data-region="United States"]');
      await page.click('div[data-region="United States"]');
      await sleep(randomDelay(4000, 8000));
    }

    const cleanProfileData = (profileData) => {
      const cleanedProfileData = {};
      for (let key in profileData) {
        if (typeof profileData[key] === "string") {
          cleanedProfileData[key] = profileData[key]
            .replace(/\u00A0/g, " ")
            .trim(); // Replace non-breaking space with regular space
        } else if (Array.isArray(profileData[key])) {
          cleanedProfileData[key] = profileData[key].map((item) =>
            item.replace(/\u00A0/g, " ").trim()
          );
        } else {
          cleanedProfileData[key] = profileData[key];
        }
      }
      return cleanedProfileData;
    };

    let isLastPage = false;
    while (!isLastPage) {
      const nextButton = await page.$(
        `${
          targetUrl === "https://www.searchfunder.com/user/list/searcher"
            ? "#userListChangePageNext"
            : "#matchListChangePageNext"
        }`
      );
      if (nextButton) {
        for (let i = 0; i < 3; i++) {
          await nextButton.click();
          await sleep(randomDelay(5000, 10000));
          // Wait for the next page to load
          await page.waitForSelector(".grid-table .list tr", {
            visible: true,
            timeout: 120000,
          });
        }
      } else {
        isLastPage = true; // No more pages to scrape
        break;
      }

      if (!isLastPage) {
        const userRows = await page.$$(".grid-table .list tr");

        for (const userRow of userRows) {
          const userId = await userRow.evaluate((row) =>
            row.getAttribute("data-user_id")
          );

          if (userId) {
            const userProfileUrl = `https://www.searchfunder.com/user/profile/${userId}`;
            const newPage = await browser.newPage();
            await newPage.setUserAgent(userAgent);
            await newPage.goto(userProfileUrl, {
              waitUntil: "networkidle2",
              timeout: 120000,
            });

            // Random delay to mimic human behavior
            await sleep(randomDelay(2000, 5000));

            // Scrape data from the user profile page
            const profileData = await newPage.evaluate(() => {
              const name =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:first-child`
                )?.innerText || "";

              const occupation =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:nth-child(3)`
                )?.innerText || "";

              const location =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:nth-child(4)`
                )?.innerText || "";

              const followers =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:nth-child(5)`
                )?.innerText || "";

              const intro =
                document.querySelector(`.editprofiledisplay`)?.innerText || "";

              const linkedInUrl = document.evaluate(
                "//a[i[contains(@class, 'fa-linkedin-square')]]/@href",
                document,
                null,
                XPathResult.STRING_TYPE,
                null
              ).stringValue;

              let linkedInProfileUrl = linkedInUrl;
              if (linkedInProfileUrl.startsWith("//")) {
                linkedInProfileUrl = `https:${linkedInProfileUrl}`;
              } else if (!linkedInProfileUrl.startsWith("https://")) {
                linkedInProfileUrl = `https://${linkedInProfileUrl}`;
              }

              const universityName =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(2) .row`
                )?.innerText || "";

              const dealSizeInitVal = document
                .evaluate(
                  "//div[contains(text(), 'deal sizes:')]/span[@class='label label-info'][1]/text()",
                  document,
                  null,
                  XPathResult.STRING_TYPE,
                  null
                )
                .stringValue.trim();

              const dealSizeFinalVal = document
                .evaluate(
                  "//div[contains(text(), 'deal sizes:')]/span[@class='label label-info'][2]/text()",
                  document,
                  null,
                  XPathResult.STRING_TYPE,
                  null
                )
                .stringValue.trim();

              let dealSize =
                dealSizeInitVal && dealSizeFinalVal
                  ? `${dealSizeInitVal} to ${dealSizeFinalVal}`
                  : "";

              const ebitdaInitVal = document
                .evaluate(
                  "//div[contains(text(), 'ebitda:')]/span[@class='label label-info'][1]/text()",
                  document,
                  null,
                  XPathResult.STRING_TYPE,
                  null
                )
                .stringValue.trim();

              const ebitdaFinalVal = document
                .evaluate(
                  "//div[contains(text(), 'ebitda:')]/span[@class='label label-info'][2]/text()",
                  document,
                  null,
                  XPathResult.STRING_TYPE,
                  null
                )
                .stringValue.trim();

              let ebitda =
                ebitdaInitVal && ebitdaFinalVal
                  ? `${ebitdaInitVal} to ${ebitdaFinalVal}`
                  : "";

              // Use document.evaluate to get elements by XPath
              const industriesNodeList = document.evaluate(
                "//span[contains(text(), 'Industries:')]/parent::div/span[not(contains(text(), 'Industries:'))]",
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              );

              let industriesArr = [];
              for (let i = 0; i < industriesNodeList.snapshotLength; i++) {
                industriesArr.push(
                  industriesNodeList.snapshotItem(i).textContent
                );
              }

              return {
                name,
                linkedInProfileUrl,
                occupation,
                location,
                universityName,
                followers,
                intro,
                dealSize,
                ebitda,
                industryNames: industriesArr,
              };
            });

            // Clean the scraped data
            const cleanedData = cleanProfileData(profileData);
            allProfiles.push(cleanedData);
            await newPage.close();

            const fields = [
              "name",
              "linkedInProfileUrl",
              "occupation",
              "location",
              "universityName",
              "followers",
              "intro",
              "dealSize",
              "ebitda",
              "industryNames",
            ];

            // Convert all collected data to CSV
            const csvData = json2csv(allProfiles, { fields });
            fs.writeFileSync("results.csv", csvData, "utf8");
            console.log(allProfiles);
          }
        }
      }
    }
  } catch (error) {
    console.log("An error occurred!!", error);
  }

  await browser.close();
};

scrapWeb();
