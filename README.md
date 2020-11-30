## Usage

You will require the latest version of [Node.js](https://nodejs.org/en/) installed - check it in the `.node-version` file.
On OSX you can use [nvm](https://github.com/creationix/nvm) and [avn](https://github.com/wbyoung/avn) to install and manage versions (avn will read the `.node-version` file).

Getting started:

```sh
# Install dependencies
npm install

# You will need to create an empty .env file and ask the admin for the contents (format below)
USERNAME=""
PASSWORD=""

# To run the contents of reviews.csv through the analysis tool
node watson.js

```

## How it works

The review content is fed in from the 'reviews.csv' document synchronously. Each review is prefixed with the same text to contextualise the content. The reviews are analysed to extract the keywords from the text which are then mapped to existing topic mappings, specified in 'trainingdata.csv'. Where a mapping has not yet been defined, the keyword will be added to this document with a placeholder mapping of 'undefined' until a user manually assigns a topic.

Where we are interested in certain keywords that we believe might not be picked up by Watson, we can define these upfront. I.e. 'rejected' and 'cancelled' are things we are interested in in the context of an order, so we want to always capture an instance of one of these. Anything added to the 'predefinedKeywords' array will be captured and output as a keyword if an instance of it is found in the assessed text.

Once the analysis is running, the results will be output to 'output.csv'. This will contain all the analysed text, the keywords extracted and the topic mapping returned from 'trainingdata.csv'. This output file will need to be emptied before each run, otherwise new results will be appended to the end of the previous run.