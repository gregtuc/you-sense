//To update bundle.js with changes from this file: browserify sentiment.js --standalone sentiment > bundle.js

/**
 * Imports
 */
var tf = require("@tensorflow/tfjs");
const axios = require("axios");

/**
 * Exported method
 */
async function getSentiment(arr) {
	return new Promise((resolve, reject) => {
		//Store all of the comments received from the extension.
		var weightedScore = 0;
		var weightSum = 0;
		setupSentimentModel().then(() => {
			for (var i = 0; i < arr.length; i++) {
				//TODO: Evaluate benefits of assigning weight to sentiment scores based on # of likes and/or # of reply's (controversialness ?)
				currentScore = evaluateScore(arr[i].text);
				if (currentScore == -1) {
					continue;
				}

				//Weighted score evaluation
				if (arr[i].likes && arr[i].likes.simpleText) {
					var likeCount = Number(formatNumber(arr[i].likes.simpleText));

					//Trying to eliminate the large amount of false negatives by eliminating weight below a threshold of 0.1.
					if (currentScore < 0.001) {
						weightedScore += currentScore;
						weightSum += 1;
					} else {
						weightedScore += currentScore * likeCount;
						weightSum = weightSum + likeCount;
					}
				} else {
					weightedScore += currentScore * 1;
					weightSum += 1;
				}
			}

			resolve(`{"score": ${weightedScore / weightSum}}`);
		});
	});
}

/**
 * Helper Section
 */
function formatNumber(val) {
	//Return numbers not containing letters in question
	if (String(val).indexOf("K") == -1 && String(val).indexOf("M") == -1) {
		return val;
	}

	//Convert numbers that are abbreviated as like 1.2k into 1200
	multiplier = val.substr(-1).toUpperCase();
	if (multiplier == "K") {
		return parseFloat(val) * 1000;
	} else if (multiplier == "M") {
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
	model:
		"https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json",
	metadata:
		"https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json",
};

let model, metadata;

function padSequences(
	sequences,
	maxLen,
	padding = "pre",
	truncating = "pre",
	value = PAD_INDEX
) {
	return sequences.map((seq) => {
		if (seq.length > maxLen) {
			if (truncating === "pre") {
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
			if (padding === "pre") {
				seq = pad.concat(seq);
			} else {
				seq = seq.concat(pad);
			}
		}

		return seq;
	});
}

function evaluateScore(text) {
	const inputText = text
		.trim()
		.toLowerCase()
		.replace(/(\.|\,|\!|\?|\*|\~|\"|\(|\-|\+|\=|\<|\>)/g, "")
		.replace(
			/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
			""
		)
		.split(" ")
		.filter((e) => e);

	const sequence = inputText.map((word) => {
		try {
			let wordIndex = metadata.word_index[word] + metadata.index_from;
			if (wordIndex > metadata.vocabulary_size || isNaN(wordIndex)) {
				wordIndex = OOV_INDEX;
			}
			return wordIndex;
		} catch (e) {
			return null;
		}
	});

	//If only one word was inputted and it's not in the dictionary, return -1.
	if (inputText.length == 1 && sequence[0] == 2) {
		return -1;
	}
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
		axios
			.get(url)
			.then((result) => {
				resolve(result.data);
			})
			.catch(function (error) {
				console.log(error);
			});
	});
}

async function setupSentimentModel() {
	if (typeof model === "undefined") {
		model = await loadModel(urls.model);
	}
	if (typeof metadata === "undefined") {
		metadata = await loadMetadata(urls.metadata);
	}
}

module.exports = { getSentiment };
