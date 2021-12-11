# you-sense

_instant 🤖 powered sentiment scores for the Youtube comment section_

## you-what 🧐?
* This is an early-stage chrome extension that uses a neural network to detect sentiment from the Youtube comment section
* Overall comment sentiment score is inserted below the video title, as illustrated below:

![Capture](https://user-images.githubusercontent.com/60011793/145688404-e02d02a5-675b-48bf-b024-3b1937d8fbc2.PNG)

## Install the Extension 💻
1. Go-to `chrome://extensions` (or `brave://extensions` if using Brave)
2. Enable developer mode (slider on top right)
3. Download this repository folder as a Zip File
4. Unzip the file and click and drag the `you-sense-main` folder onto the extensions page
5. Make sure the extension is turned on

_Remember: The comment section is an incredibly polarizing place where those with hardline views tend to speak up. Anything above a score of 50 is considered positive, and anything below 50 is negative. Score is simply provided for additional detail._

## How it works 
* This extension uses [TensorFlow.js](https://github.com/tensorflow/tfjs-examples/tree/master/sentiment) to run comments through a pre-trained convolutional neural net [(CNN)](https://en.wikipedia.org/wiki/Convolutional_neural_network) to detect sentiment scores - all inside of your own browser!
* Training was performed on a set of 25,000 IMDB movie reviews, but this approach may evolve moving forward 🎬 🍿
* [Browserify](https://github.com/browserify/browserify) is used to make key node modules available
* Comments are retrieved from the public Youtube API -the same one your browser uses when loading the comments manually. Currently, 5 pages of comments (~40 comments) are fetched to avoid excessive requests

## Can this replace the removal of dislikes?
* This extension detects sentiment, not number of dislikes
* If the video is sad, sad comment sentiment may be reflected as a negative 😭. Similarily, sarcastic/ironic comments may be taken literally 😤
* This extension performs consistenly in consistent comments sections (think how-to and tutorial videos)
