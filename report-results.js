const fs = require("fs");
// const { write } = require("lighthouse");
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
    return printer.write(
      printResults,         // output
      fileType,             // mode
      `reports/${fileName}` // path
    ).catch(error => console.error(error));
  }
  return null;
}

function printResultsToTerminal(results, optionSet) {
  const title = results.categories.accessibility.title;
  const score = results.categories.accessibility.score * 100;
  console.log("\n********************************\n");
  console.log(`Options: ${optionSet.settings.emulatedFormFactor}\n`);
  console.log(`${title}: ${score}`);
  console.log("\n********************************");
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

module.exports = { reportResults };