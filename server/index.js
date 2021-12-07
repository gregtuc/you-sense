//Express imports
const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

//cors and middleware
var cors = require("cors");
var bodyparser = require("body-parser");
app.use(cors());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

//Tensorflow js
var tf = require('@tensorflow/tfjs');

//Accept POST requests at the localhost:3000/ endpoint
app.post("/", (req, res) => {

    //Store all of the comments received from the extension.
    var arr = req.body.commentArray;


    var scoreSum = 0;
    var iterationCount = 0;
    setupSentimentModel().then(()=> {
        for(var i=0; i<arr.length; i++){
            iterationCount = iterationCount + 1;
            currentScore = getSentimentScore(arr[i].text);

            //Get the sentiment score for each comment and add it to a running total
            if (arr[i].hasOwnProperty("likes") && arr[i].likes.hasOwnProperty("simpleText")) {
              likeCount = verifyNumber(arr[i].likes.simpleText);

              //Scale up the running total and iteration count according to the number of likes.
              var weighedScore = 0;
              for(var j=0; j<Number(likeCount); j++){
                weighedScore = weighedScore + currentScore;
                iterationCount = iterationCount + 1;
              }
              scoreSum += weighedScore;
          } else {
            //If comment didn't have any likes, just add the sentiment score and then increase the iteration count.
            scoreSum += currentScore;
            iterationCount = iterationCount + 1;
          }
        }

        //Log and return the overall sentiment score.
        console.log("Score: ", scoreSum/iterationCount);
        res.json(`{"score": ${scoreSum/iterationCount}}`);
    })
});

//Make the server start listening on port 3000.
app.listen(port, () => {
    console.log(`Listening on ${port}`);
});


//*******************HELPER FUNCTIONS*******************//
function verifyNumber (val) {
  //Convert numbers that are abbreviated as like 1.2k into 1200
  multiplier = val.substr(-1).toUpperCase();
  if (multiplier == "K"){
    return parseFloat(val) * 1000;
  } else if (multiplier == "M"){
      return parseFloat(val) * 1000000;
  } else {
    return val;
  }
}


//****************SENTIMENT FUNCTIONS****************//
const PAD_INDEX = 0;
const OOV_INDEX = 2;

var urls = {
    model: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json',
    metadata: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json'
};

let model, metadata;

function padSequences(sequences, maxLen, padding = 'pre', truncating = 'pre', value = PAD_INDEX) {
    return sequences.map(seq => {
      if (seq.length > maxLen) {
        if (truncating === 'pre') {
          seq.splice(0, seq.length - maxLen);
        } else {
          seq.splice(maxLen, seq.length - maxLen);
        }
      }
  
      if (seq.length < maxLen) {
        const pad = [];
        for (let i = 0; i < maxLen - seq.length; ++i) {
          pad.push(value);
        }
        if (padding === 'pre') {
          seq = pad.concat(seq);
        } else {
          seq = seq.concat(pad);
        }
      }
  
      return seq;
    });
  }

function getSentimentScore(text) {
    const inputText = text.trim().toLowerCase().replace(/(\.|\,|\!)/g, '').split(' ');
    // Convert the words to a sequence of word indices.
    const sequence = inputText.map(word => {
      try{      
        let wordIndex = metadata.word_index[word] + metadata.index_from;
        if (wordIndex > metadata.vocabulary_size) {
          wordIndex = OOV_INDEX;
        }
        return wordIndex;
        } catch(e){
            return null;
        }
    });
    // Perform truncation and padding.
    const paddedSequence = padSequences([sequence], metadata.max_len);
    const input = tf.tensor2d(paddedSequence, [1, metadata.max_len]);
 
    const predictOut = model.predict(input);
    const score = predictOut.dataSync()[0];
    predictOut.dispose();
 
    return score;
}

async function loadModel(url) {
    try {
        const model = await tf.loadLayersModel(url);
        return model;
    } catch (err) {
        console.log(err);
    }
}

async function loadMetadata(url) {
    try {
        const metadataJson = await fetch(url);
        const metadata = await metadataJson.json();
        return metadata;
    } catch (err) {
        console.log(err);
    }
}

async function setupSentimentModel(){
    if(typeof model === 'undefined'){
        model = await loadModel(urls.model);
    }
    if(typeof metadata === 'undefined'){
        metadata = await loadMetadata(urls.metadata);
    }
}