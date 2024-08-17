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

    // // Enter "United States" into the input field
    // await page.waitForSelector("#listusersearchlocations");
    // await page.type("#listusersearchlocations", "United States");

    // // Wait for the dropdown list to populate by checking if it contains any div elements
    // await page.waitForFunction(
    //   () =>
    //     document.querySelector("#listuserslocationlist").children.length > 0,
    //   { timeout: 20000 }
    // );

    // // Click the first option in the dropdown
    // await page.evaluate(() => {
    //   const firstOption = document.querySelector(
    //     "#listuserslocationlist div.listuserslocation"
    //   );
    //   if (firstOption) firstOption.click();
    // });

    // // Wait for the page to reflect the selection (adjust timeout as needed)
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // Select the region to United States
    await page.waitForSelector('div[data-region="United States"]');
    await page.click('div[data-region="United States"]');
    await new Promise((resolve) => setTimeout(resolve, 6000));

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
      const nextButton = await page.$("#userListChangePageNext");
      if (nextButton) {
        for (let i = 0; i < 3; i++) {
          await nextButton.click();
          await new Promise((resolve) => setTimeout(resolve, 6000));
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

              const occupation =
                document.querySelector(
                  `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(1) div:nth-child(3)`
                )?.innerText || "";

              const selector =
                document
                  .querySelector(
                    `.container .row:first-child div:first-child div.panel:first-child .row > div:nth-of-type(2) a:nth-of-type(2)`
                  )
                  .getAttribute("href") || "";

              // Split the selector string on '.'
              const selectorArray = selector.split(".");

              // Remove the 0th index
              const filteredArray = selectorArray.slice(1);

              // Combine the 1st and 2nd index elements
              const linkedInProfileUrl = `${filteredArray[0]}.${filteredArray[1]}`;

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
                universityName,
                stats: [stat, stat2],
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
              "Occupation",
              "universityName",
              "stats",
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
