/**
 * Imports
*/
var tf = require('@tensorflow/tfjs');
const axios = require('axios');

/**
 * Exported method
*/
async function getSentiment(arr){
  return new Promise((resolve, reject) => {
        //Store all of the comments received from the extension.
        var scoreSum = 0;
        var iterationCount = 0;
        setupSentimentModel().then(()=> {
            for(var i=0; i<arr.length; i++){
                //TODO: Evaluate benefits of assigning weight to sentiment scores based on # of likes and/or # of reply's (controversialness ?)
                currentScore = evaluateScore(arr[i].text);
                scoreSum += currentScore;
                iterationCount = iterationCount + 1;
            }
            
            resolve(`{"score": ${scoreSum/iterationCount}}`);
        })
      });
}

/**
 * Helper Section
*/
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


/**
 * Technical Sentiment Section
 * https://github.com/tensorflow/tfjs-examples/tree/master/sentiment
*/

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

function evaluateScore(text) {
    const inputText = text.trim().toLowerCase().replace(/(\.|\,|\!)/g, '').split(' ');
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
  return new Promise((resolve, reject) => {
    axios.get(url)
        .then((result) => {
            resolve(result.data);
        }).catch(function (error) {
            console.log(error);
        });
    });
}

async function setupSentimentModel(){
    if(typeof model === 'undefined'){
        model = await loadModel(urls.model);
    }
    if(typeof metadata === 'undefined'){
        metadata = await loadMetadata(urls.metadata);
    }
}

module.exports = {getSentiment};