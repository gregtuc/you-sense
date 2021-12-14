var commentsArray = []; //Store all of the comments
var floodControl1 = false; //Manages initialization call (acquire the first continuation token)
var floodControl2 = false; //Manages recursive calls (prevent calling if no continuation token)
var floodControl3 = 0; //Manages max number of call iterations

document.addEventListener("yt-navigate-finish", function (event) {
    //Reset globals after navigating away from a video.
    commentsArray = []; 
    floodControl1 = false; //Prevent re-entering the initial next call (first call doesn't contain comments, only the pagination token)
    floodControl2 = false; //Prevent continuing recursive calls if we've reached the end of the comment.
    floodControl3 = 0; //Prevent overloading youtube with too many requests (max 5 per video)
    //Reinject the script.
    fetchAndInject();
});

/*
Method to fetch the comments from the public Youtube API recursively. Maximum of 5 recursive calls at a time to prevent throttling.
The result of this function (commentArray) is passed to the getSentiment method.
*/
function fetchAndInject(...arguments) {
    floodControl3 += 1;
    var argsArray = Array.prototype.slice.call(arguments);
    var xhttp = new XMLHttpRequest();
    var res;

    //Do something with the response...
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var continuationToken;
            var comments;
            res = JSON.parse(this.responseText);

            if ((argsArray.length == 0) || (floodControl1 == false)) {
                //Activate Flood Control (this condition cannot be re-entered)
                floodControl1 = true;

                //Get continuation token
                var prefix = res.contents.twoColumnWatchNextResults.results.results.contents;
                for(var i=0; i<prefix.length; i++){
                    try{
                        if(prefix[i].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token){
                            continuationToken = prefix[i].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token;
                            break;
                        }
                    } catch(e){
                        continue;
                    }
                }

                //Recurse using the continuation token
                fetchAndInject(String((continuationToken)));
            } else {    

                //If this token is undefined, comments are disabled.
                try{                
                    //Get continuation token
                    continuationToken = res.onResponseReceivedEndpoints[0].reloadContinuationItemsCommand.continuationItems[0].commentsHeaderRenderer.sortMenu.sortFilterSubMenuRenderer.subMenuItems[1].serviceEndpoint.continuationCommand.token;
                } catch(e){
                    commentsDisabled();
                    return;
                }

                //Activate second flood control if we've reached the end of the comments.
                if (continuationToken == undefined || continuationToken == null || continuationToken.length <= 1) {
                    floodControl2 = true;
                }

                //Get comments from response
                comments = res.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems;

                //Process each comment before pushing
                for (var i = 0; i < comments.length; i++) {
                    var found = false;
                    for(var j=0; j < commentsArray.length; j++){
                        try{
                            if(commentsArray[j].id == comments[i].commentThreadRenderer.comment.commentRenderer.commentId){
                                found = true;
                                break;
                            }
                        } catch(e){  
                        }
                    }
                    if(found == false){
                        try {
                            commentsArray.push({
                                id: comments[i].commentThreadRenderer.comment.commentRenderer.commentId,
                                text: comments[i].commentThreadRenderer.comment.commentRenderer.contentText.runs[0].text,
                                likes: comments[i].commentThreadRenderer.comment.commentRenderer.voteCount,
                                replyCount: comments[i].commentThreadRenderer.comment.commentRenderer.replyCount
                            });
                        } catch (e) {
                        }
                    }
                }

                //Recurse using the continuation token if it exists && if max calls haven't exceeded 5 (to prevent youtube throttling our connection)
                if (!floodControl2 && floodControl3 < 5) {
                    fetchAndInject(String(continuationToken));
                } else {
                    //Get Sentiment
                    getSentiment(commentsArray);
                }
            }
        }
    };

    //Get the video id from url parameters
    var url = new URL(window.location.href);
    var urlParam = url.searchParams.get("v");
    var urlString = String(urlParam);

    //Open a POST request
    xhttp.open("POST", "https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", true);

    //Set all the headers.
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.setRequestHeader("authority", "www.youtube.com");
    xhttp.setRequestHeader("x-origin", "https://www.youtube.com");
    xhttp.setRequestHeader("accept", "*/*");
    xhttp.setRequestHeader("accept-language", "en-US,en;q=0.9");

    //Define the payload
    if (argsArray.length < 1) {
        var data = JSON.stringify({
            "context": {
                "client": {
                    "hl": "en",
                    "gl": "CA",
                    "remoteHost": "70.82.31.11",
                    "deviceMake": "",
                    "deviceModel": "",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36,gzip(gfe)",
                    "clientName": "WEB",
                    "clientVersion": "2.20211115.01.00",
                    "osName": "Windows",
                    "osVersion": "10.0",
                    "originalUrl": `https://www.youtube.com/watch?v=${urlString}`,
                    "memoryTotalKbytes": "1000000",
                },
                "user": {
                    "lockedSafetyMode": false
                },
                "request": {
                    "useSsl": true,
                    "internalExperimentFlags": [],
                    "consistencyTokenJars": []
                }
            },
            "videoId": `${urlString}`
        });
    } else {
        var data = JSON.stringify({
            "context": {
                "client": {
                    "hl": "en",
                    "gl": "CA",
                    "remoteHost": "70.82.31.11",
                    "deviceMake": "",
                    "deviceModel": "",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36,gzip(gfe)",
                    "clientName": "WEB",
                    "clientVersion": "2.20211115.01.00",
                    "osName": "Windows",
                    "osVersion": "10.0",
                    "originalUrl": `https://www.youtube.com/watch?v=${urlString}`,
                    "memoryTotalKbytes": "1000000",
                },
                "user": {
                    "lockedSafetyMode": false
                },
                "request": {
                    "useSsl": true,
                    "internalExperimentFlags": [],
                    "consistencyTokenJars": []
                }
            },
            "videoId": `${urlString}`,
            "continuation": `${argsArray[0]}`
        });
    }

    //Send the payload
    if (document.location.pathname == "/watch") {
        xhttp.send(data);
    }
}

/**
 * Method to get sentiment and inject the score onto the page
 * @param {*} commentArray 
 */
function getSentiment(commentArray) {
    sentiment.getSentiment(commentArray).then(res => {
        var number = Number(JSON.parse(res).score * 100);
        if(!document.querySelector('#sentiment-score')) {
            var newElement = document.createElement('yt-formatted-string');
            newElement.className = "style-scope ytd-video-primary-info-renderer";
            newElement.innerText = "tester";
            newElement.id = "sentiment-score";
            if(number>=50){
                newElement.style="font-weight:bold;color:green;font-size:100%;"
            } else {
                newElement.style="font-weight:bold;color:red;font-size:100%;"
            }
            document.querySelector("#info-strings").appendChild(newElement);
            document.querySelector("#sentiment-score").innerText= `${number.toFixed(1)}/100`;
        } else {
            document.querySelector("#sentiment-score").innerText= `${number.toFixed(1)}/100`;
            if(number>=50){
                document.querySelector("#sentiment-score").style="font-weight:bold;color:green;font-size:120%;"
            } else {
                document.querySelector("#sentiment-score").style="font-weight:bold;color:red;font-size:120%;"
            }
        }
    })
}

function commentsDisabled(){
    if(!document.querySelector('#sentiment-score')) {
        var newElement = document.createElement('yt-formatted-string');
        newElement.className = "style-scope ytd-video-primary-info-renderer";
        newElement.innerText = "tester";
        newElement.id = "sentiment-score";
        newElement.style="color:yellow;font-size:100%;"
        document.querySelector("#info-strings").appendChild(newElement);
        document.querySelector("#sentiment-score").innerText= `Comments disabled`;
    } else {
        document.querySelector("#sentiment-score").innerText= `Comments disabled`;
        document.querySelector("#sentiment-score").style="font-weight:bold;color:yellow;font-size:120%;"
    }
}
