
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


setInterval(()=>{
  onExtendStream_WebRTC()
},1000 * 40)

// Device Access Variables:
let streamExtensionToken = "";
let currentStreamingIndex;
// let accessToken="ya29.a0AXooCguxzaDv9kI6YZjqsmglGlPT3A8usb3GhZ4-46UmtN9_LBp1TclT9swr5cYi1nPJYRfVj6BcDdTUVNUH0HvQO7W-rsyWkf_FzUoB3_IZHRQPOxdKI41-_WLj3miMNvbbXP0gBwJY2870AI57g59P6eHRWhT9PCLbaCgYKAbASARESFQHGX2Mitxa1BZdGZwuJNcEQ2fDtIQ0171"
/** deviceAccessRequest - Issues requests to Device Access Rest API */
function deviceAccessRequest(method, call, localpath, payload = "",access_token,mediaStream) {
  let xhr = new XMLHttpRequest();
  currentStreamingIndex = mediaStream;
  xhr.open(method, selectedAPI + localpath);
  xhr.setRequestHeader('Authorization', 'Bearer '+access_token);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

  xhr.onload = function () {
    if(xhr.status === 200) {
      let responsePayload = "* Payload: \n" + xhr.response;
      pushLog(LogType.HTTP, method + " Response", responsePayload);
      console.log(mediaStream,'mediaStreammediaStream========');
      
      deviceAccessResponse(method, call, xhr.response,mediaStream);
    } else {
      toastr.error(xhr.responseText);
      pushError(LogType.HTTP, method + " Response", xhr.responseText);
      window.location.reload();
    }
  };

  let requestEndpoint = "* Endpoint: \n" + selectedAPI + localpath;
  let requestAuthorization = "* Authorization: \n" + 'Bearer ' + accessToken;
  let requestPayload = "* Payload: \n" + JSON.stringify(payload, null, 4);
  pushLog(LogType.HTTP, method + " Request",
      requestEndpoint + "\n\n" + requestAuthorization + "\n\n" + requestPayload);

  if (method === 'POST' && payload && payload !== "") {
    xhr.send(JSON.stringify(payload));
  } else {
    xhr.send();
  }
}

/** deviceAccessResponse - Parses responses from Device Access API calls */
function deviceAccessResponse(method, call, response,mediaStream) {
  pushLog(LogType.HTTP, method + " Response", response);
  let data = JSON.parse(response);
  // Check if response data is empty:
  if(!data) {
    pushError(LogType.ACTION, "Empty Response!", "Device Access response contains empty response!");
    return;
  }
  // Based on the original request call, interpret the response:
  switch(call) {
    case 'listDevices':
      clearDevices(); // Clear the previously detected devices.

      // Check for detected devices:
      if(!data.devices) {
        pushError(LogType.ACTION, "No Devices!", "List Devices response contains no devices!");
        return;
      }

      // Iterate over detected devices:
      for (let i = 0; i < data.devices.length; i++) {
        // Parse Device Id:
        let scannedId = data.devices[i].name;
        let startIndexId = scannedId.lastIndexOf('/');
        let deviceId = scannedId.substring(startIndexId + 1);
        // Parse Device Type:
        let scannedType = data.devices[i].type;
        let startIndexType = scannedType.lastIndexOf('.');
        let deviceType = scannedType.substring(startIndexType + 1);
        // Parse Device Structure:
        let scannedAssignee = data.devices[i].assignee;
        let startIndexStructure = scannedAssignee.lastIndexOf('/structures/');
        let endIndexStructure = scannedAssignee.lastIndexOf('/rooms/');
        let deviceStructure = scannedAssignee.substring(startIndexStructure + 12, endIndexStructure);

        // Handle special case for Displays (Skip, no support!)
        if(deviceType === "DISPLAY")
          continue;

        // Handle special case for Thermostats (Read Temperature Unit)
        if(deviceType === "THERMOSTAT") {
          let tempScale = data.devices[i].traits["sdm.devices.traits.Settings"].temperatureScale;
          if(tempScale === "FAHRENHEIT") {
            document.getElementById("heatUnit").innerText = "°F";
            document.getElementById("coolUnit").innerText = "°F";
          } else {
            document.getElementById("heatUnit").innerText = "°C";
            document.getElementById("coolUnit").innerText = "°C";
          }
        }

        // Parse Device Room:
        let scannedName = data.devices[i].traits["sdm.devices.traits.Info"].customName;
        let scannedRelations = data.devices[i].parentRelations;
        let scannedRoom = scannedRelations[0]["displayName"];
        // Parse Device Name:
        let deviceName = scannedName !== "" ? scannedName : scannedRoom + " " + stringFormat(deviceType);
        // Parse Device Traits:
        let deviceTraits = Object.keys(data.devices[i].traits);

        // WebRTC check:
        let traitCameraLiveStream = data.devices[i].traits["sdm.devices.traits.CameraLiveStream"];

        if(traitCameraLiveStream) {
          let supportedProtocols = traitCameraLiveStream.supportedProtocols;
          if (supportedProtocols && supportedProtocols.includes("WEB_RTC")) {
            deviceType += "-webrtc";
            initializeWebRTC();
          }
        }

        addDevice(new Device(deviceId, deviceType, deviceName, deviceStructure, deviceTraits));
      }
      break;
    case 'listStructures':
      console.log("List Structures!");
      break;
    case 'generateStream':
      // document.getElementById("video-stream").removeAttribute("hidden");
      timestampGenerateStreamResponse = new Date();
      updateAnalytics();
      console.log(`Generate Stream response - `, timestampGenerateStreamResponse);
      if(data["results"] && (data["results"].hasOwnProperty("streamExtensionToken") || data["results"].hasOwnProperty("mediaSessionId"))){
        updateStreamExtensionToken(data["results"].streamExtensionToken || data["results"].mediaSessionId);
        streamExtensionToken = data["results"].streamExtensionToken || data["results"].mediaSessionId;
      }
      if(data["results"] && data["results"].hasOwnProperty("answerSdp")) {
        updateWebRTC(data["results"].answerSdp,mediaStream);
        pushLog(LogType.ACTION, "[Video Stream]", "");
      }
      break;
    // case 'generateStream2':
    //   console.log('stream2');
      
    //   // document.getElementById("video-stream2").removeAttribute("hidden");
    //   timestampGenerateStreamResponse = new Date();
    //   updateAnalytics2();
    //   console.log(`Generate Stream response - `, timestampGenerateStreamResponse);
    //   if(data["results"] && (data["results"].hasOwnProperty("streamExtensionToken") || data["results"].hasOwnProperty("mediaSessionId")))
    //     updateStreamExtensionToken2(data["results"].streamExtensionToken || data["results"].mediaSessionId);
    //   if(data["results"] && data["results"].hasOwnProperty("answerSdp")) {
    //     updateWebRTC2(data["results"].answerSdp);
    //     pushLog(LogType.ACTION, "[Video Stream]", "");
    //   }
    //   break;
    case 'refreshStream':
      timestampExtendStreamResponse = new Date();
      updateAnalytics();
      console.log(`Refresh Stream response - `, timestampExtendStreamResponse);
      if(data["results"] && (data["results"].hasOwnProperty("streamExtensionToken") || data["results"].hasOwnProperty("mediaSessionId")))
        updateStreamExtensionToken(data["results"].streamExtensionToken || data["results"].mediaSessionId);
      streamExtensionToken = data["results"].streamExtensionToken || data["results"].mediaSessionId;

      break;
    case 'refreshStream2':
      timestampExtendStreamResponse = new Date();
      updateAnalytics2();
      console.log(`Refresh Stream response - `, timestampExtendStreamResponse);
      if(data["results"] && (data["results"].hasOwnProperty("streamExtensionToken") || data["results"].hasOwnProperty("mediaSessionId")))
        updateStreamExtensionToken2(data["results"].streamExtensionToken || data["results"].mediaSessionId);
      break;
    case 'stopStream':
      timestampStopStreamResponse = new Date();
      updateAnalytics();
      console.log(`Stop Stream response - `, timestampStopStreamResponse);
      initializeWebRTC();
      break;
    case 'fanMode':
      if(document.getElementById("btnFanMode").textContent === "Activate Fan")
        document.getElementById("btnFanMode").textContent = "Deactivate Fan";
      else
        document.getElementById("btnFanMode").textContent = "Activate Fan";
      break;
    case 'thermostatMode':
      console.log("Thermostat Mode!");
      break;
    case 'temperatureSetpoint':
      console.log("Temperature Setpoint!");
      break;
    default:
      pushError(LogType.ACTION, "Error", "Unrecognized Request Call!");
  }
}

/** openResourcePicker - Opens Resource Picker on a new browser tab */
function openResourcePicker() {
  window.open(selectedResourcePicker);
}


/// Device Access API ///

/** onListDevices - Issues a ListDevices request */
function onListDevices() {
  let endpoint = "/enterprises/" + projectId + "/devices";
  deviceAccessRequest('GET', 'listDevices', endpoint);
}

/** onListStructures - Issues a ListStructures request */
function onListStructures() {
  let endpoint = "/enterprises/" + projectId + "/structures";
  deviceAccessRequest('GET', 'listStructures', endpoint);
}

/** onFan - Issues a FanMode change request */
function onFan() {
  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  // Construct the payload:
  let payload = {
    "command": "sdm.devices.commands.Fan.SetTimer",
    "params": {}
  };
  // Set correct FanMode based on the current selection:
  switch (document.getElementById("btnFanMode").textContent) {
    case "Activate Fan":
      payload.params["timerMode"] = "ON";
      payload.params["duration"] = "3600s";
      break;
    case "Deactivate Fan":
      payload.params["timerMode"] = "OFF";
      break;
    default:
      pushError(LogType.ACTION, "Error", "Button Mode not recognized!");
      return;
  }
  deviceAccessRequest('POST', 'fanMode', endpoint, payload);
}

/** onThermostatMode - Issues a ThermostatMode request */
function onThermostatMode() {
  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let tempMode = document.getElementById("sctThermostatMode").value;
  let payload = {
    "command": "sdm.devices.commands.ThermostatMode.SetMode",
    "params": {
      "mode": tempMode
    }
  };
  deviceAccessRequest('POST', 'thermostatMode', endpoint, payload);
}

/** onTemperatureSetpoint - Issues a TemperatureSetpoint request */
function onTemperatureSetpoint() {
  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let heatCelsius = parseFloat(document.getElementById("txtHeatTemperature").value);
  let coolCelsius = parseFloat(document.getElementById("txtCoolTemperature").value);
  // Convert temperature values based on temperature unit:
  if(document.getElementById("heatUnit").innerText === "°F") {
    heatCelsius = (heatCelsius - 32) * 5 / 9;
  }
  if(document.getElementById("coolUnit").innerText === "°F") {
    coolCelsius = (coolCelsius - 32) * 5 / 9;
  }
  // Construct the payload:
  let payload = {
    "command": "",
    "params": {}
  };
  // Set correct temperature fields based on the selected ThermostatMode:
  switch (document.getElementById("sctThermostatMode").value) {
    case "HEAT":
      payload.command = "sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat";
      payload.params["heatCelsius"] = heatCelsius;
      break;
    case "COOL":
      payload.command = "sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool";
      payload.params["coolCelsius"] = coolCelsius;
      break;
    case "HEATCOOL":
      payload.command = "sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange";
      payload.params["heatCelsius"] = heatCelsius;
      payload.params["coolCelsius"] = coolCelsius;
      break;
    default:
      pushError(LogType.ACTION, "Invalid Mode!", "Off and Eco modes don't allow this function!"
          + "\n (Try changing the Thermostat Mode to some other value)");
      return;
  }
  deviceAccessRequest('POST', 'temperatureSetpoint', endpoint, payload);
}

/** onGenerateStream - Issues a GenerateRtspStream request */
function onGenerateStream() {
  clearAnalytics(true);
  timestampGenerateStreamRequest = new Date();
  updateAnalytics();
  console.log(`onGenerateStream() - `, timestampGenerateStreamRequest);

  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.GenerateRtspStream"
  };
  deviceAccessRequest('POST', 'generateStream', endpoint, payload);
}
function onGenerateStream2() {
  clearAnalytics(true);
  timestampGenerateStreamRequest = new Date();
  updateAnalytics();
  console.log(`onGenerateStream() - `, timestampGenerateStreamRequest);

  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id2 + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.GenerateRtspStream"
  };
  deviceAccessRequest('POST', 'generateStream2', endpoint, payload);
}

/** onExtendStream - Issues a ExtendRtspStream request */
function onExtendStream() {
  timestampExtendStreamRequest = new Date();
  updateAnalytics();
  console.log(`onExtendStream() - `, timestampExtendStreamRequest);

  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.ExtendRtspStream",
    "params": {
      "streamExtensionToken" : streamExtensionToken
    }
  };
  deviceAccessRequest('POST', 'refreshStream', endpoint, payload);
}

/** onStopStream - Issues a StopRtspStream request */
function onStopStream() {
  timestampStopStreamRequest = new Date();
  updateAnalytics();
  console.log(`onStopStream() - `, timestampStopStreamRequest);

  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.StopRtspStream",
    "params": {
      "streamExtensionToken" : streamExtensionToken
    }
  };
  deviceAccessRequest('POST', 'stopStream', endpoint, payload);
}
async function getAccessToken(client_id,client_secret,refresh_token) {
  const token_url = 'https://oauth2.googleapis.com/token';
  const payload = new URLSearchParams({
    client_id: client_id,
    client_secret: client_secret,
    refresh_token: refresh_token,
    grant_type: 'refresh_token'
  });

  try {
    const response = await fetch(token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const access_token = data.access_token;
    console.log(`New access token: ${access_token}`);
    return access_token;
  } catch (error) {
    toastr.error(error);
    console.error(`Failed to get access token: ${error}`);
    throw error;
  }
}

// Call the function to get a new access token

/** onGenerateStream_WebRTC - Issues a GenerateWebRtcStream request */
async function onGenerateStream_WebRTC(urlParamsForAccessToken,mediaStream) {
  // Get the full URL
// var url = window.location.href;

// // Create a URL object
// var urlObj = new URL(url);

// // Use URLSearchParams to extract the parameters
// var params = new URLSearchParams(urlObj.search);

// // Get the access token and assign it to a variable
console.log(urlParamsForAccessToken,'urlParamsForAccessToken');
var accessToken = urlParamsForAccessToken.get('accessToken');
var refreshToken = urlParamsForAccessToken.get('refreshToken');
var clientId = urlParamsForAccessToken.get('clientId');
var secret = urlParamsForAccessToken.get('secret');
var projectIds=urlParamsForAccessToken.get('projectId')
// Get the id and assign it to a variable
var idsParam = urlParamsForAccessToken.get('id');
const idsArray = idsParam.split(',');
const id = idsArray[mediaStream];
console.log(id,'ididid');
console.log(id,mediaStream,'++++++++++++++++++++++++++');

// id='AVPHwEuxrJHT2VNoW77NLuxWXXqJsWUjF-Vn1PaItSyH0gr3XhdVgTgnKat8LnWtTeJNV0DI9nGxPUlJ-OaM-RU3DXNT0Q'
let new_access
try {
  new_access =await getAccessToken(clientId,secret,refreshToken)
} catch (error) {
  console.log(error)
}

console.log(offerSDP,'offerSDPofferSDPofferSDP');



console.log("Access Token: " + new_access);
console.log("ID: " + id);
  clearAnalytics(true);
  timestampGenerateWebRtcStreamRequest = new Date();
  updateAnalytics();
  console.log(`onGenerateStream_WebRTC() - `, timestampGenerateWebRtcStreamRequest);

  let endpoint = "/enterprises/" + projectIds + "/devices/" + id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream",
    "params": {
      "offerSdp": offerSDP
    }
  };

  deviceAccessRequest('POST', 'generateStream', endpoint, payload,new_access,mediaStream);
}
// async function onGenerateStream_WebRTC2() {
//   // Get the full URL
// var url = window.location.href;

// // Create a URL object
// var urlObj = new URL(url);

// // Use URLSearchParams to extract the parameters
// var params = new URLSearchParams(urlObj.search);

// // Get the access token and assign it to a variable
// var accessToken = params.get('accessToken');
// var refreshToken = params.get('refreshToken');
// var clientId = params.get('clientId');
// var secret = params.get('secret');
// var projectIds=params.get('projectId')
// // Get the id and assign it to a variable
// var id2 = params.get('id');
// id2='AVPHwEuxrJHT2VNoW77NLuxWXXqJsWUjF-Vn1PaItSyH0gr3XhdVgTgnKat8LnWtTeJNV0DI9nGxPUlJ-OaM-RU3DXNT0Q'
// let new_access
// try {
//   new_access =await getAccessToken(clientId,secret,refreshToken)
// } catch (error) {
//   console.log(error)
// }




// console.log("Access Token: " + new_access);
// console.log("ID: " + id2);
//   clearAnalytics(true);
//   timestampGenerateWebRtcStreamRequest = new Date();
//   updateAnalytics();
//   console.log(`onGenerateStream_WebRTC() - `, timestampGenerateWebRtcStreamRequest);

//   let endpoint = "/enterprises/" + projectIds + "/devices/" + id2 + ":executeCommand";
//   let payload = {
//     "command": "sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream",
//     "params": {
//       "offerSdp": offerSDP
//     }
//   };

//   deviceAccessRequest('POST', 'generateStream2', endpoint, payload,new_access);
// }

/** onExtendStream_WebRTC - Issues a ExtendWebRtcStream request */
async function onExtendStream_WebRTC() {
  timestampExtendWebRtcStreamRequest = new Date();
  updateAnalytics();
  var id = urlParamsForAccessToken.get('id');
  var accessToken = urlParamsForAccessToken.get('accessToken');
var refreshToken = urlParamsForAccessToken.get('refreshToken');
var clientId = urlParamsForAccessToken.get('clientId');
var secret = urlParamsForAccessToken.get('secret');
var projectIds=urlParamsForAccessToken.get('projectId')
// Get the id and assign it to a variable

let new_access
try {
  new_access =await getAccessToken(clientId,secret,refreshToken)
} catch (error) {
  console.log(error)
}
  console.log(`onExtendStream_WebRTC() - `, timestampExtendWebRtcStreamRequest,id);

  let endpoint = "/enterprises/" + projectIds + "/devices/" + id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.ExtendWebRtcStream",
    "params": {
      "mediaSessionId" : streamExtensionToken
    }
  };
  deviceAccessRequest('POST', 'refreshStream', endpoint, payload,new_access);
}
// function onExtendStream_WebRTC2() {
//   timestampExtendWebRtcStreamRequest = new Date();
//   updateAnalytics();
//   console.log(`onExtendStream_WebRTC() - `, timestampExtendWebRtcStreamRequest);

//   let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id2 + ":executeCommand";
//   let payload = {
//     "command": "sdm.devices.commands.CameraLiveStream.ExtendWebRtcStream",
//     "params": {
//       "mediaSessionId" : streamExtensionToken
//     }
//   };
//   deviceAccessRequest('POST', 'refreshStream2', endpoint, payload);
// }

/** onStopStream_WebRTC - Issues a StopWebRtcStream request */
function onStopStream_WebRTC(currentStreamUI) {
  console.log(currentStreamUI,'currentStreamUIcurrentStreamUI');
  
  timestampStopWebRtcStreamRequest = new Date();
  updateAnalytics();
  console.log(`onStopStream_WebRTC() - `, timestampStopWebRtcStreamRequest);

  let endpoint = "/enterprises/" + projectId + "/devices/" + selectedDevice.id + ":executeCommand";
  let payload = {
    "command": "sdm.devices.commands.CameraLiveStream.StopWebRtcStream",
    "params": {
      "mediaSessionId" : streamExtensionToken
    }
  };
  deviceAccessRequest('POST', 'stopStream', endpoint, payload,currentStreamUI);
}
