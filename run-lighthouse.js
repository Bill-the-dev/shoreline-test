// 'use strict';
// import fs from "fs";
// import lighthouse from "lighthouse";
// import chromeLauncher from "chrome-launcher";
// import printer from 'lighthouse/lighthouse-cli/printer';
const fs = require("fs");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
// const printer = require('lighthouse/lighthouse-cli/printer');

const runEnvironment = "local";
// read csv and convert to array
// const urlArray = fs.readFileSync("site-list.csv").toString().split("\n");
const urlArray = ['https://regrid.com', 'https://regrid.com/parcels']
// const url = "https://regrid.com/";
const lighthouseOptionsArray = [
  {
    extends: "lighthouse:default",
    settings: {
      onlyCategories: [
        "performance", 
        "accessibility", 
        "best-practices", 
        "seo"  
      ],
      emulatedFormFactor: "desktop",
      output: ["html", "json"]
    }
  },
  {
    extends: "lighthouse:default",
    settings: {
      onlyCategories: [
        "performance", 
        "accessibility", 
        "best-practices", 
        "seo"  
      ],
      emulatedFormFactor: "mobile",
      output: ["html", "json"]
    }
  }
];

function wait(val) {
  return new Promise(resolve => setTimeout(resolve, val));
}

async function launchLighthouse(optionSet, opts, results, url) {
  const chrome = await chromeLauncher
    .launch({ chromeFlags: opts.chromeFlags });
  opts.port = chrome.port;
  try {
    results = await lighthouse(url, opts, optionSet);
  } catch (e) {
    console.error("lighthouse", e);
  }
  if (results)
    reportResults(results, runEnvironment, optionSet, chrome);
  await wait(500);
  chrome.kill();
}

async function runLighthouseAnalysis() {
  let results;
  const opts = {
    chromeFlags: ["--no-sandbox", "--headless"]
  };
  for (const optionSet of lighthouseOptionsArray) {
    for (i in urlArray) {
      console.log(`--- Lighthouse analysis - ${optionSet.settings.emulatedFormFactor} - ${urlArray[i]} ---`);
      await launchLighthouse(optionSet, opts, results, urlArray[i]);

    }
  }
}

// FROM REPORT RESULTS
// const printer = require('lighthouse/lighthouse-cli/printer');

function createFileName(optionSet, fileType) {
  const { emulatedFormFactor } = optionSet.settings;
  const currentTime = new Date().toISOString().slice(0, 16);
  const fileExtension = fileType === "json" ? "json" : "html";
  return `${currentTime}-${emulatedFormFactor}.${fileExtension}`;
}

function writeLocalFile(results, runEnvironment, optionSet) {
  if (results.report) {
    const fileType = runEnvironment === "ci" ? "json" : "html";
    const fileName = createFileName(optionSet, fileType);
    fs.mkdirSync("reports/", { recursive: true }, error => {
      if (error) console.error("error creating directory", error);
    });
    const printResults =
      fileType === "json" ? results.report[1] : results.report[0];
    // return printer.write(
    fs.writeFileSync(`reports/html/${fileName}`, printResults, error => console.error(error));
  }
  return null;
}

function printResultsToTerminal(results, optionSet) {
  const fileName = createFileName(optionSet, "txt")
  var logger = fs.createWriteStream(`reports/txt/${fileName}.txt`, {
    flags: 'a' // 'a' means appending (old data will be preserved)
  });

  for (let i = 0; i < results.categories.length; i++) {
    const category = results.categories[i];
    let title = results.categories.category.title;
    let score = results.categories.category.score * 100
    logger.write("\n********************************\n")
    logger.write(`Options: ${optionSet.settings.emulatedFormFactor}\n}`)
    logger.write(`${title}: ${score}\n`)
    logger.write("\n********************************\n")

    console.log("\n********************************\n");
    console.log(`Options: ${optionSet.settings.emulatedFormFactor}\n`);
    console.log(`${title}: ${score}`);
    console.log("\n********************************");
    
  }

  // const title = results.categories.accessibility.title;
  // const score = results.categories.accessibility.score * 100;
}

function passOrFailA11y(results, optionSet, chrome) {
  const targetA11yScore = 95;
  const { windowSize } = optionSet;
  const accessibilityScore = results.categories.accessibility.score * 100;
  if (accessibilityScore) {
    if (windowSize === "desktop") {
      if (accessibilityScore < targetA11yScore) {
        console.error(
          `Target accessibility score: ${targetA11yScore}, current accessibility score ${accessibilityScore}`
        );
        chrome.kill();
        process.exitCode = 1;
      }
    }
    if (windowSize === "mobile") {
      if (accessibilityScore < targetA11yScore) {
        console.error(
          `Target accessibility score: ${targetA11yScore}, current accessibility score ${accessibilityScore}`
        );
        chrome.kill();
        process.exitCode = 1;
      }
    }
  }
}

async function reportResults(results, runEnvironment, optionSet, chrome) {
  if (results.lhr.runtimeError) {
    console.error(results.lhr.runtimeError.message);
  }
  await writeLocalFile(results, runEnvironment, optionSet);
  printResultsToTerminal(results.lhr, optionSet);
  return passOrFailA11y(results.lhr, optionSet, chrome);
}

runLighthouseAnalysis();