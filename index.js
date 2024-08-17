import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { json2csv } from "json-2-csv";
import fs from "fs";

puppeteer.use(StealthPlugin());

let loginUrl = "https://www.searchfunder.com/auth/login";
let targetUrl = "https://www.searchfunder.com/user/list/searcher"; // change the url if needed
// Credentials
const email = "asadujan@gmail.com";
const password = "Demo5911";

const scrapWeb = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1000,
  });

  let allProfiles = []; // all the data after scraping

  try {
    // Navigate to the login page
    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Enter login credentials
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Navigate to the user list page
    await page.goto(targetUrl, {
      waitUntil: "load",
      timeout: 60000,
    });

    // Enter United States to the input field
    await page.waitForSelector("#listusersearchlocations");
    await page.type("#listusersearchlocations", "United States");

    // await page.waitForSelector("#listuserslocationlist", {
    //   visible: true,
    //   timeout: 10000,
    // });
    // await page.evaluate(() => {
    //   let options = document.querySelectorAll("#listuserslocationlist");
    //   options.forEach((option) => {
    //     if (option.innerText.includes("United States")) {
    //       option.click();
    //     }
    //   });
    // });

    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Select the region to United States
    await page.waitForSelector('div[data-region="United States"]');
    await page.click('div[data-region="United States"]');
    await new Promise((resolve) => setTimeout(resolve, 6000));

    let isLastPage = false;
    while (!isLastPage) {
      const nextButton = await page.$("#userListChangePageNext");
      if (nextButton) {
        await nextButton.click();
        // Wait for the next page to load
        await page.waitForSelector(".grid-table .list tr", {
          visible: true,
          timeout: 120000,
        });
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
            await newPage.goto(userProfileUrl, {
              waitUntil: "networkidle2",
              timeout: 120000,
            });

            // Scrape data from the user profile page
            const profileData = await newPage.evaluate(() => {
              const name =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:first-child`
                )?.innerText || "";

              const bio =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:nth-child(2)`
                )?.innerText || "";

              const linkedInProfileUrl =
                document
                  .querySelector(
                    `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(2) a:nth-of-type(2)`
                  )
                  ?.getAttribute("href") || "";

              const universityName =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(2) .row`
                )?.innerText || "";

              const stat =
                document.querySelector(
                  `.container .row div:nth-child(2) .row:nth-of-type(1) div`
                )?.innerText || "";

              const stat2 =
                document.querySelector(
                  `.container .row div:nth-child(2) .row:nth-of-type(1) div:last-child`
                )?.innerText || "";

              const location =
                document.querySelector(
                  `.container .row:first-child .panel:nth-child(3) div:nth-of-type(1) span:last-child`
                )?.innerText || "";

              const industriesNodeList = document.querySelectorAll(
                `.container .row:first-child .panel:nth-child(3) div:nth-of-type(2) span`
              );
              let industriesArr = [...industriesNodeList];

              let industryNames = industriesArr.map((data) => data.textContent);
              industryNames.shift();

              return {
                name,
                linkedInProfileUrl,
                bio,
                universityName,
                location,
                stats: [stat, stat2],
                industryNames,
              };
            });

            allProfiles.push(profileData);
            await newPage.close();

            const fields = [
              "name",
              "linkedInProfileUrl",
              "bio",
              "universityName",
              "location",
              "stats",
              "industryNames",
            ];

            // Convert all collected data to CSV
            const csvData = json2csv(allProfiles, { fields });
            fs.writeFileSync("results.csv", csvData, "utf8");
            console.log(
              "Data successfully written to results.csv",
              allProfiles
            );
          }
        }
      }
    }
  } catch (error) {
    console.log("An error occurred!!", error);
  }

  await browser.close();
};

// const createCSV = (data) => {
//   const csvRow = `${data.name},${data.linkedInProfileUrl},${data.bio},${
//     data.universityName
//   },${data.location},[${data.stats}],[${data.industryNames.join(" | ")}]\n`;
//   fs.appendFileSync("results.csv", csvRow, "utf8");
// };

scrapWeb();
