
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


// State Variables:
let isSignedIn = false;
let isSubscribed = false;
let selectedDevice;
let videoIdsList = []
let devicesList=[]
var deviceNames =[]
/// Primary Functions ///

/** init - Initializes the loaded javascript */
async function init() {
  var url = window.location.href;

  // Create a URL object
  var urlObj = new URL(url);

  // Use URLSearchParams to extract the parameters
  var params = new URLSearchParams(urlObj.search);
  let idsParam = params.get('id');
  if (idsParam) {
    devicesList = idsParam.split(',');
    const createElementCount = devicesList.length
    const container = document.getElementById('camera-panel');
    let devices = params.get('devices')
// Get the id and assign it to a variable
    deviceNames = devices.split(',');
    if(devicesList.length == 1){
      const camera1 = createCameraElement(0);
      container.appendChild(camera1);
      container.style.height = 'auto';
      console.log('hello');
      container.classList.add('single-camera-container');
      container.classList.remove('camera-container');
    }else{
      devicesList.forEach((element,index) => {
        const camera1 = createCameraElement(index);
        container.appendChild(camera1);
        
      });

    }
  }
  if(videoIdsList){
    // videoStream = ['video-stream','video-stream2']
    initializeWebRTC(params, videoIdsList)
    initPersonCount();

  }
  function captureScreenshot(deviceId, index) {
    const video = document.getElementById(`video-stream${index}`);
    let cameraId = deviceId;
    
    if (!video) {
      console.error("Video element not found");
      return;
    }

    // Ensure the video is loaded and ready
    if (video.readyState >= 2) {
      captureCanvasScreenshot(video, cameraId, index);
    } else {
      video.addEventListener("loadeddata", () =>
        captureCanvasScreenshot(video, cameraId, index)
      );
    }
}

function captureCanvasScreenshot(video, deviceId, index) {
    // Create a canvas element to draw the video frame
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match the video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert the canvas to a blob
    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      detectPeople(blob, deviceId, index);
    });
}


  // Capture screenshot every 10 minutes
  // setInterval(captureScreenshot, 10 * 60 * 1000);

  function updatePeopleCount(deviceId, count, cameraIndex) {
    // const baseUrl = "https://dev.api.barseen.com/"; // Replace with your actual base URL
    const baseUrl = "https://api.barseen.com/"; // Replace with your actual base URL
    const endpoint = `${baseUrl}/google-accounts/updatePeopleCount`;

    const data = {
      deviceId: deviceId,
      count: count,
    };
    console.log(JSON.stringify(data));
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Network response was not ok " + response.statusText
          );
        }
        return response.json();
      })
      .then((data) => {
        console.log("Success:", data);
        let crowdStatusElement = document.getElementById(
          `crowd-status-${cameraIndex}`
        )
        let capacityElement =  document.getElementById(
          `people-capacity-${cameraIndex}`
        )
        if(data.data.capacity !== null){
          crowdStatusElement.innerText = `Crowd Status: ${data.data.crowdStatus}`;
          capacityElement.innerText = `Capacity: ${data.data.capacity}`;
          capacityElement.style.display ='block';
          crowdStatusElement.style.display ='block';
        }else{
          capacityElement.style.display ='none';
          crowdStatusElement.style.display ='none';
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
      });
  }

  function initPersonCount() {
    devicesList.forEach((element, index) => {
      setTimeout(() => {
        captureScreenshot(element, index);  // Immediate execution for each element
      }, 5000);
     
    });
  
    // Then, set an interval to execute for all elements every 10 seconds
    setInterval(() => {
      devicesList.forEach((element, index) => {
        captureScreenshot(element, index);  // Repeated execution after 10 seconds for each element
      });
    }, 60000); 
  }
  let model;
  document.addEventListener("DOMContentLoaded", async () => {
    model = await cocoSsd.load();
  });

  async function detectPeople(imageUrl,deviceId,cameraIndex) {
   const count= await detectHeadCount(imageUrl)
   console.log(count,'countcountcount');
   
    updatePeopleCount(deviceId, count,cameraIndex);
    document.getElementById(
      `person-count-${cameraIndex}`
    ).innerText = `Persons detected: ${count}`;
  }


  async function detectHeadCount(imageBlob) {
return new Promise(async (resolve, reject) => {
  const apiKey = '';
  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64data = reader.result.split(',')[1]; // Extract the base64 encoded string

    const requestBody = {
      requests: [
        {
          image: {
            content: base64data
          },
          features: [
            {
              type: 'OBJECT_LOCALIZATION',
              maxResults: 50
            }
          ]
        }
      ]
    };

    try {
     
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
  
        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;
        let headCount = 0;
  
        objects?.forEach(object => {
          if (object.name.toLowerCase() === 'person') {
            headCount++;
          }
        });
  
        resolve(headCount);
      
     
    } catch (error) {
      reject(error);
    }
  };

  reader.readAsDataURL(imageBlob); // Read the image blob as a data URL
});
}
  readStorage();                // Reads data from browser's local storage if available
  // await handleAuth();           // Checks incoming authorization code from /auth path
  // await exchangeCode();         // Exchanges authorization code to an access token
  // await refreshAccess();        // Retrieves a new access token using refresh token
  // initializeDevices();          // Issues a list devices call if logged-in
  // onGenerateStream_WebRTC()
}

function createCameraElement(idSuffix) {
  // Create the outer camera element div
  const cameraElement = document.createElement('div');
  const cameraInfo = document.createElement('div');
  cameraElement.classList.add('camera-element');
  cameraInfo.classList.add('camera-info');
  cameraElement.style.display = 'block';
  cameraInfo.style.display = 'flex';
  cameraElement.id = `video-stream-div${idSuffix}`;
  if(devicesList.length == 1){
    cameraElement.classList.add('single-camera-element');
    cameraElement.classList.remove('camera-element');

  }

    // Create the person count div
    const personCount = document.createElement('div');
    personCount.classList.add('person-count');
    personCount.id = `person-count-${idSuffix}`;
    personCount.textContent = 'Persons detected: 0';

    // Create the crowdStatus div
    const crowdStatus = document.createElement('div');
    crowdStatus.classList.add('crowd-status');
    crowdStatus.id = `crowd-status-${idSuffix}`;
    crowdStatus.style.display ='none';
    // crowdStatus.textContent = 'Crowd Status: ';
    
    // Create the crowdStatus div
    const peopleCapacity = document.createElement('div');
    peopleCapacity.classList.add('people-capacity');
    peopleCapacity.id = `people-capacity-${idSuffix}`;
    peopleCapacity.style.display ='none';
    // peopleCapacity.textContent = 'People Capacity: ';

    // Create the device name div
    const deviceName = document.createElement('div');
    deviceName.classList.add('devices');
    deviceName.id = `device-name-${idSuffix}`;
    deviceName.textContent = 'Camera: 0';
    if(deviceNames){
      deviceName.innerText = `Camera: ${deviceNames[idSuffix]}`;

    }  // Create the video element
    const video = document.createElement('video');
    video.id = `video-stream${idSuffix}`;
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('controls', '');
    videoIdsList.push(video.id)
    // Append elements to the cameraElement div
    cameraInfo.appendChild(personCount);
    cameraInfo.appendChild(crowdStatus);
    cameraInfo.appendChild(peopleCapacity);
    cameraInfo.appendChild(deviceName);
    cameraElement.appendChild(cameraInfo);
    cameraElement.appendChild(video);

  return cameraElement;
}
/** readStorage - Reads data from browser's local storage if available */
function readStorage() {

  if (localStorage["logs"]) {
    // Parse local storage for logs:
    const parsedStorage = JSON.parse(localStorage["logs"]);
    // Read the parsed storage:
    if (Array.isArray(parsedStorage))
      for (let i = 0; i < parsedStorage.length; i++)
        logs.push(parsedStorage[i]);
    // Display ingested logs:
    // addLogEntries(logs);
  }

  if (localStorage["clientId"]) {
    updateClientId(localStorage["clientId"]);
  }
  if (localStorage["clientSecret"]) {
    updateClientSecret(localStorage["clientSecret"]);
  }
  if (localStorage["projectId"]) {
    updateProjectId(localStorage["projectId"]);
  }

  if (localStorage["oauthCode"]) {
    updateOAuthCode(localStorage["oauthCode"]);
  }
  if (localStorage["accessToken"]) {
    updateAccessToken(localStorage["accessToken"]);
  }
  if (localStorage["refreshToken"]) {
    updateRefreshToken(localStorage["refreshToken"]);
  }

  if (localStorage["isSignedIn"] === true || localStorage["isSignedIn"] === "true") {
    updateSignedIn(localStorage["isSignedIn"]);
  }
  // Update the App Controls based on isSignedIn:
  updateAppControls();

  if (localStorage["subscriptionId"]) {
    updateSubscriptionId(localStorage["subscriptionId"]);
  }

  if (localStorage["serviceAccountKey"]) {
    updateServiceAccountKey(localStorage["serviceAccountKey"]);
  }

  if (localStorage["logFilter"]) {
    logFilter = localStorage["logFilter"].split(",");
  }
  // Update the Log Filters based on logFilter:
  updateLogFilter(logFilter);
}

/** initializeDevices - Issues a list devices call if logged-in */
function initializeDevices() {
  if(isSignedIn) {
    clickListDevices();
  }
}


/// Helper Functions ///

/** Device Object Model */
class Device {
  constructor(id, type, name, structure, traits) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.structure = structure;
    this.traits = traits;
  }
}

/** addDevice - Add device to Device Control list */
function addDevice(device) {
  // Create an Option object
  let opt = document.createElement("option");

  // Assign text and value to Option object
  opt.text = device.name;
  opt.value = JSON.stringify(device);

  // Add an Option object to Drop Down List Box
  document.getElementById("sctDeviceList").options.add(opt);

  // If this is the first device added, choose it
  if(document.getElementById("sctDeviceList").options.length === 1) {
    selectedDevice = device;
    showDeviceControls();
  }
}

/** clearDevices - Clear Device Control list */
function clearDevices() {
  let deviceListLength = document.getElementById("sctDeviceList").options.length;
  for (let i = deviceListLength - 1; i >= 0; i--) {
    document.getElementById("sctDeviceList").options[i] = null;
  }
  hideDeviceControls();
}

/** stringFormat - Formats input string to Upper Camel Case */
function stringFormat(str) {
  return str.replace(/(\w)(\w*)/g,
      function(g0,g1,g2){return g1.toUpperCase() + g2.toLowerCase();});
}
setInterval(() => {
  window.location.reload();
}, 25 * 60 * 1000);
