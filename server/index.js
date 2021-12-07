const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
var cors = require("cors");
var bodyparser = require("body-parser");
const { json } = require("body-parser");
app.use(cors());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
var tf = require('@tensorflow/tfjs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.post("/", (req, res) => {
    var arr = req.body.commentArray;
    var scoreSum = 0;
    var iterationCount = 0;
    setupSentimentModel().then(()=> {
        for(var i=0; i<arr.length; i++){
            iterationCount = iterationCount + 1;
            currentScore = getSentimentScore(arr[i].text);
            //Get the sentiment score
            if (arr[i].hasOwnProperty("likes") && arr[i].likes.hasOwnProperty("simpleText")) {
              //Weigh the sentiment score according to the number of likes
              likeCount = verifyNumber(arr[i].likes.simpleText);

              //Weigh the current comment according to it's like count
              var weighedScore = 0;
              for(var j=0; j<Number(likeCount); j++){
                weighedScore = weighedScore + currentScore;
                iterationCount = iterationCount + 1;
              }

              scoreSum += weighedScore;
          } else {
            scoreSum += currentScore;
            iterationCount = iterationCount + 1;
          }
        }

        console.log("Summed: ", scoreSum, iterationCount, scoreSum/iterationCount);
        res.json(`{"score": ${scoreSum/iterationCount}}`);
    })
/*


*/
    
});

app.listen(port, () => {
    console.log(`Listening on ${port}`);
});


//HELPER FUNCTIONS

function verifyNumber (val) {
  multiplier = val.substr(-1).toUpperCase();
  if (multiplier == "K"){
    return parseFloat(val) * 1000;
  } else if (multiplier == "M"){
      return parseFloat(val) * 1000000;
  } else {
    return val;
  }
}


//SENTIMENT SECTION

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