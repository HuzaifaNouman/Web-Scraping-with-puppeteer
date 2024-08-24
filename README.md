
# Web Scraping Project: Searchfunder

## Overview

This project is a web scraping application built using [Puppeteer](https://github.com/puppeteer/puppeteer), a Node.js library that provides a high-level API to control headless Chrome or Chromium over the DevTools Protocol. The goal of this project is to scrape data from the [Searchfunder](https://www.searchfunder.com/) website.

### Key Features

- **Automates browsing and data extraction** from Searchfunder.
- **Handles page navigation** and dynamic content loading.
- **Bypasses common bot detection techniques** using Puppeteer Extra plugins.
- **Extracts relevant information**, such as user name,their location, and other pertinent data.

## How to use ?

### Clone the repository:

To get started, clone the repository using the following command:

```bash
git clone https://github.com/HuzaifaNouman/Web-Scraping-with-puppeteer.git
cd your-dir-name
npm install or npm i
npm run dev
```




## Scraping Searchfunder

Searchfunder is a platform for entrepreneurs, investors, and professionals interested in searching for and acquiring businesses. This project focuses on extracting public information available on the site.


### Robots.txt and Scraping Policy

Before scraping any website, it's crucial to check their `robots.txt` file to understand the site's policy on web scraping. The `robots.txt` file for Searchfunder is as follows:

```
User-agent: *
Disallow:
Sitemap: https://www.searchfunder.com/sitemap
```
This indicates that the site does not have specific restrictions on web scraping for all user agents, but you should always respect the site's terms of service and scraping policies.

If you like this project, give the repository a star and follow me! 👍


