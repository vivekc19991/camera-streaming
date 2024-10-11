
/* Copyright 2022 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


// WebRTC Variables:
let localPeerConnection=[];
let localSendChannel=[];
let localStream=[];
let remoteStream=[];
let offerSDP =[];
let initialized = false;
let videoElement=[];
let videoElementId='';
let urlParamsForAccessToken={};


// WebRTC Configurations:
const localOfferOptions = {
  offerToReceiveVideo: 1,
  offerToReceiveAudio: 1,
};

const mediaStreamConstraints = {
  audio: false,
  video: false,
};


/// WebRTC Analytics ///

// Page launch
let timestampInitializeWebRTC;
let timestampStartLocalStream;
let timestampCreateSdpOffer;
let timestampCreateSdpOfferSuccess;
let timestampSetLocalDescription;
let timestampSetLocalDescriptionSuccess;

// Camera Stream button pressed
// let timestampGenerateStreamRequest;
// let timestampGenerateWebRtcStreamRequest; // senderSdpOffer
// let timestampGenerateStreamResponse; // sendSdpOffer success / timestampSdpAnswerReceived
// let timestampExtendStreamRequest;
// let timestampExtendWebRtcStreamRequest;
// let timestampExtendStreamResponse;
// let timestampStopStreamRequest;
// let timestampStopWebRtcStreamRequest;
// let timestampStopStreamResponse;
let timestampSetRemoteDescription;
let timestampSetRemoteDescriptionSuccess;
// let timestampConnected;
// let timestampPlaybackStarted;


/// WebRTC Functions ///

/** initializeWebRTC - Triggers starting a new WebRTC stream on initialization */
function initializeWebRTC(params, videoElementToStream) {
  let idsParam = params.get('id');
  if (idsParam) {
    const idsArray = idsParam.split(',');
    urlParamsForAccessToken = params;
    // Removed the 'initialized' check here to avoid blocking further iterations

    for (let stream = 0; stream < idsArray.length; stream++) {  // Ensure loop runs for each stream
      if (idsArray[stream] !== null && idsArray[stream] !== undefined) {
        const videoElementId = videoElementToStream[stream];
        const videoElement = document.getElementById(videoElementId);

        if (videoElement) {
          videoElement.addEventListener('play', (event) => {
            updateAnalytics(); // Assuming analytics are updated when playback starts
          });

          // Use setTimeout to delay execution of each stream after the 1st one
          const delay = stream === 0 ? 0 : stream * 5000;  // No delay for 1st stream, 10 sec for others

          setTimeout(() => {
            sendStreamIndexToUI(stream)
            startLocalStream(stream, videoElementToStream); // Initialize stream here
          }, delay);

        } else {
          console.error(`Video element with ID ${videoElementId} not found.`);
        }
      }
    }
  }
}

function startLocalStream(mediaStreamIndex, videoElementToStream) {
  const timestampStartLocalStream = new Date();

  const servers = { 'sdpSemantics': 'unified-plan', 'iceServers': [] };
  
  // Initialize the peer connection for this mediaStreamIndex
  remoteStream[mediaStreamIndex] = new MediaStream();
  localPeerConnection[mediaStreamIndex] = new RTCPeerConnection(servers);
    
  // Log to confirm peer connection creation for each stream
  console.log(`Created peer connection for stream index ${mediaStreamIndex}`, localPeerConnection[mediaStreamIndex]);

  localPeerConnection[mediaStreamIndex].ondatachannel = receiveChannelCallback;
  localSendChannel[mediaStreamIndex] = localPeerConnection[mediaStreamIndex].createDataChannel('dataSendChannel', null);
  
  localPeerConnection[mediaStreamIndex].addEventListener('iceconnectionstatechange', handleConnectionChange);

  // Log the mediaStreamIndex when track event is added
  localPeerConnection[mediaStreamIndex].addEventListener('track', (event) => {
    gotRemoteMediaTrack(event, videoElementToStream[mediaStreamIndex], mediaStreamIndex);
  });

  // Create the offer and log the process for debugging
  localPeerConnection[mediaStreamIndex].createOffer(localOfferOptions)
  .then((offer) => {
    createdOffer(offer, mediaStreamIndex);
  })
  .catch(setSessionDescriptionError);
}
function gotRemoteMediaTrack(event, streamElement, mediaStreamIndex) {
  console.log(`gotRemoteMediaTrack() called for mediaStreamIndex: ${mediaStreamIndex}`);
  
  // Log the received track
  console.log(`Received track for mediaStreamIndex: ${mediaStreamIndex}`, event.track);

  remoteStream[mediaStreamIndex].addTrack(event.track);
  const videoElement = document.getElementById(streamElement);
  
  if (videoElement) {
    videoElement.srcObject = remoteStream[mediaStreamIndex];
    console.log(`Remote stream set for mediaStreamIndex: ${mediaStreamIndex}`);
  } else {
    console.error(`Video element with ID ${streamElement} not found.`);
  }
}
/** createdOffer - Handles local offerSDP creation */
function createdOffer(description, mediaStreamIndex) {
  updateOfferSDP(description.sdp); 

  timestampSetLocalDescription = new Date();
  updateAnalytics();
  console.log(`setLocalDescription() - `, timestampSetLocalDescription);

  // Set the local description for the specific peer connection
  localPeerConnection[mediaStreamIndex].setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection[mediaStreamIndex],mediaStreamIndex);
    })
    .catch(setSessionDescriptionError);
}

/** updateWebRTC - Updates WebRTC connection on receiving answerSDP */
function updateWebRTC(answerSDP, mediaStreamIndex) {
  console.log(`SDP Answer for mediaStreamIndex: ${mediaStreamIndex}`, answerSDP);
  
  localPeerConnection[mediaStreamIndex].setRemoteDescription({ type: 'answer', sdp: answerSDP })
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection[mediaStreamIndex]);
    })
    .catch(setSessionDescriptionError);
}


/// Helper Functions ///

/** getPeerName - Handles received peer name */
function getPeerName(peerConnection) {
  console.log(`getPeerName()`);
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
}

/** receiveChannelCallback - Handles received channel callback */
const receiveChannelCallback = (event) => {
  console.log('receiveChannelCallback');
  const receiveChannel = event.channel;
  receiveChannel.onmessage = handleReceiveMessage;
};

/** setDescriptionSuccess - Handles received success description */
function setDescriptionSuccess(peerConnection, functionName) {
  console.log(`setDescriptionSuccess()`);
  const peerName = getPeerName(peerConnection);
  console.log(`${peerName} ${functionName} complete`);
}

/** setLocalDescriptionSuccess - Handles received local success description */
function setLocalDescriptionSuccess(peerConnection,mediaStreamIndex) {
  timestampSetLocalDescriptionSuccess = new Date();
  updateAnalytics();
  console.log(`setLocalDescriptionSuccess() - `, timestampSetLocalDescriptionSuccess);
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
  console.log(mediaStreamIndex,'mediaStreamIndex');
  
  onGenerateStream_WebRTC(urlParamsForAccessToken,mediaStreamIndex)
}

/** setRemoteDescriptionSuccess - Handles received remote success description */
function setRemoteDescriptionSuccess(peerConnection) {
  timestampSetRemoteDescriptionSuccess = new Date();
  updateAnalytics();
  console.log(`setRemoteDescriptionSuccess() - `, timestampSetRemoteDescriptionSuccess);
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

/** setSessionDescriptionError - Handles session description error */
function setSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}.`);
}

/** handleLocalMediaStreamError - Handles media stream error */
function handleLocalMediaStreamError(error) {
  console.log(`navigator.getUserMedia error: ${error.toString()}.`);
}

/** handleReceiveMessage - Handles receiving message */
const handleReceiveMessage = (event) => {
  console.log(`Incoming DataChannel push: ${event.data}`);
};

/** handleConnectionChange - Handles connection change */
function handleConnectionChange(event) {
  console.log('ICE state change event: ', event);
  if (event != null && event.currentTarget != null && event.target.iceConnectionState == "connected") {
    if (timestampConnected == undefined) {
      timestampConnected = new Date();
      console.log(`connected - `, timestampConnected);
      updateAnalytics();
    }
  }
}

/** clearAnalytics - Clear analytics timestamps */
function clearAnalytics(cameraAnalyticsOnly = false) {
  console.log('Clearing analytics');

  if (!cameraAnalyticsOnly) {
    // Page launch
    timestampInitializeWebRTC = undefined;
    timestampStartLocalStream = undefined;
    timestampCreateSdpOffer = undefined;
    timestampCreateSdpOfferSuccess = undefined;
    timestampSetLocalDescription = undefined;
    timestampSetLocalDescriptionSuccess = undefined;
  }

  // Camera Stream button pressed
  timestampGenerateStreamRequest = undefined;
  timestampGenerateWebRtcStreamRequest = undefined;
  timestampGenerateStreamResponse = undefined;
  timestampExtendStreamRequest = undefined;
  timestampExtendWebRtcStreamRequest = undefined;
  timestampExtendStreamResponse = undefined;
  timestampStopStreamRequest = undefined;
  timestampStopWebRtcStreamRequest = undefined;
  timestampStopStreamResponse = undefined;
  timestampSetRemoteDescription = undefined;
  timestampSetRemoteDescriptionSuccess = undefined;
  timestampConnected = undefined;
  timestampPlaybackStarted = undefined;

  updateAnalytics();
}
