const fs = require("fs");
const NaturalLanguageUnderstandingV1 = require("watson-developer-cloud/natural-language-understanding/v1.js");
const csvWriter = require("csv-write-stream");
const sw = require("stopword");
const csv = require("csv-parser");
const dotenv = require('dotenv').config()

let results = [];
let reviews = [];
let sanitisedArray = [];
let customStopwords = ["nandos", "nandos.", "nando", "nando's", "fact", "wold"];

async function readFromCsv() {
  fs.createReadStream("trainingdata.csv")
    .pipe(csv(["keyword", "topic"]))
    .on("data", (topic) => results.push(topic))
    .on("end", () => {
      return results;
    });
}

async function readReviews() {
  fs.createReadStream("reviews.csv")
    .pipe(csv(["review"]))
    .on("data", (review) => reviews.push(review))
    .on("end", () => {
      sanitise();
      return reviews;
    });
}

async function sanitise() {
  for (var i = 0; i < reviews.length; i++) {
    //sanitise the array of reviews by removing stop words
    reviewString = reviews[i].review.toString().toLowerCase();
    oldString = reviewString.split(" ");
    newString = sw.removeStopwords(oldString, customStopwords);
    //Get rid of anything under 4 words long
    if (newString.length > 0) {
      joinedString = newString.join(" ");
      sanitisedArray.push(joinedString);
    }
  }
  beginAnalysis(sanitisedArray);
}

let keywordArray = [];
let topicArray = [];
let mappedArray = [];
let undefinedKeywords = [];
const predefinedKeywords = ["rejected", "cancelled", "fulfilled", "cancelling", "denied", "not fulfilled", "cancellation", "cancel"];
const writer = csvWriter({ sendHeaders: false });
writer.pipe(fs.createWriteStream("trainingdata.csv", { flags: "a" }));
let analyzeParams;
let review;

const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  version: "2020-08-01",
  url:
  "https://api.eu-de.natural-language-understanding.watson.cloud.ibm.com/instances/1c3735c9-3b60-40b5-88d7-1fd432f23c91",
});

async function beginAnalysis(arr) {
  for (const sentence of sanitisedArray) {
    composeRequest(arr.indexOf(sentence));
    let result = await makeCall(analyzeParams);
    analyseResults(result, sentence);
  }
}

async function makeCall(req) {
  let result = await naturalLanguageUnderstanding.analyze(req);
  return result;
}

async function composeRequest(i) {
  review = sanitisedArray[i];

  analyzeParams = {
    text: review,
    language: "en",
    features: {
      keywords: {
        emotion: true,
        sentiment: true,
      },
      sentiment: {
        targets: predefinedKeywords,
      },
      categories: { limit: 1 },
    },
  };
  console.log(analyzeParams);
  return analyzeParams;
}

async function analyseResults(resp, rev) {
  let response = resp;
  let analysis = {};
  analysis.keywords = [];
  analysis.topics = [];
  let relevance;
  console.log("RESPONSE");

  for (var i = 0; i < response.keywords.length; i++) {
    let word = response.keywords[i].text.toLowerCase();
    relevance = response.keywords[i].relevance;

    let keywordInstance = response.keywords[i].text;

    //sets the threshold for whether the keyword is mapped to a topic based on its relevance
    if (relevance < 0.01) {
      return;
    } else {
      let found = (obj = results.find((o) => o.keyword === word));
      //if topic is found, push it to the analysis object
      if (found) {
        analysis.topics.push(found.topic);
        keywordArray.push(found.keyword);
        analysis.keywords.push(keywordInstance);
        //if the topic is found but is undefined, push it to the list of topics but not the analysis object
        if (found.topic !== "undefined") {
          topicArray.push(found.topic);
        }
        //if topic is not listed, push it to the undefined list
      } else if (!found) {
        undefinedKeywords.push(word);
        writer.write({ phrase: word, topic: "undefined" });
      }
    }
  }

  //check to see if any predefined keywords have been hit and add them to the output regardless of relevance
  if (response.sentiment !== undefined) {
    let predefinedKeyword = response.sentiment.targets[0].text;
    analysis.keywords.push(predefinedKeyword);
    let foundPredefined = (obj = results.find((o) => o.keyword === predefinedKeyword));
    if (foundPredefined) {
      analysis.topics.push(foundPredefined.topic);
    }
  }

  var csvOutput = csvWriter({ sendHeaders: false });
  csvOutput.pipe(fs.createWriteStream("output.csv", { flags: "a" }));
  //output analysis to csv file
  let output = rev.replace("it was nearly stopped because ", "");
  csvOutput.write({
    review: output,
    keywords: `${analysis.keywords}`,
    topics: `${analysis.topics}`,
  });
  csvOutput.end();

  let topicOccurrences = {};

  //create a count of all topic occurrences
  topicArray.forEach(function (topic) {
    topicOccurrences[topic] = (topicOccurrences[topic] || 0) + 1;
  });

  console.log("Topic occurences from all reviews");
  console.log(topicOccurrences);
}

readFromCsv();
readReviews();
