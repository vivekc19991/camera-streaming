
# Bar Streaming Application

This is a web-based streaming application designed for bar environments. The application uses WebRTC for video streaming, Google Cloud PubSub for event handling, and Google OAuth for authentication. It is built with HTML, JavaScript, and CSS.

## Features
- **WebRTC Video Streaming**: Stream video content using WebRTC.
- **Google Cloud Integration**: Integration with Google Cloud services like PubSub, Device Access API, and Smart Device Management (SDM).
- **OAuth2 Authentication**: Sign in with Google accounts and obtain access tokens.
- **PubSub Event Handling**: Retrieve and display events from Google Cloud PubSub.
- **UI Controls**: Multiple UI buttons to handle device interactions, authentication, and streaming actions.

## Files
1. **index.html**: The main entry point for the web app that includes video elements and links to various scripts and stylesheets.
2. **app.js**: Handles core application logic including initializing WebRTC, device management, and local storage access.
3. **webrtc.js**: Manages WebRTC video streaming logic including handling SDP offers and remote descriptions.
4. **auth.js**: Manages OAuth2 authentication including signing in, token management, and Google authorization requests.
5. **events.js**: Handles PubSub event subscription and fetching events using Google Cloud APIs.
6. **logger.js**: Provides logging functionality to track application actions, errors, and HTTP responses.
7. **ui.js**: Contains UI interaction logic such as button clicks for sign-in, device listing, and stream controls.
8. **api.js**: Contains functions for making API requests to Google Cloud services, such as listing devices and generating streams.
9. **style.css**: Contains styles and layout rules for the web interface.

## Parameters Required for Streaming

To properly start the WebRTC streaming process and call the HTML page, several parameters need to be passed in the URL. These parameters are used to authenticate the session, provide access tokens, and identify the project and device.

### Required Parameters:
1. **accessToken**: The OAuth2 access token used to authenticate the user and authorize the API requests.
2. **refreshToken**: The OAuth2 refresh token used to obtain a new access token when the current one expires.
3. **clientId**: The OAuth2 client ID for your Google Cloud project.
4. **clientSecret**: The OAuth2 client secret for your Google Cloud project.
5. **projectId**: The Google Cloud project ID associated with the devices and APIs.
6. **deviceId**: The ID of the device (such as a camera) from which the stream will be generated.

### Example URL:

When calling the `index.html` page, the following parameters need to be included in the URL query string:

```
https://bar-streaming.s3.amazonaws.com/index.html?accessToken=<your_access_token>&refreshToken=<your_refresh_token>&clientId=<your_client_id>&clientSecret=<your_client_secret>&projectId=<your_project_id>&deviceId=<your_device_id>
```

### Example:

```plaintext
https://bar-streaming.s3.amazonaws.com/index.html?accessToken=ya29.a0Af...&refreshToken=1//0g...&clientId=1234567890-abcdef.apps.googleusercontent.com&clientSecret=GOCSPX...&projectId=my-google-cloud-project&deviceId=device1234
```

### URL Breakdown:
- **accessToken**: The OAuth2 access token that authenticates the user. This is a required parameter.
- **refreshToken**: The OAuth2 refresh token that can be used to refresh the access token when needed.
- **clientId**: Your OAuth2 client ID for your Google project.
- **clientSecret**: Your OAuth2 client secret for your Google project.
- **projectId**: The Google Cloud project ID where your devices and APIs are managed.
- **deviceId**: The ID of the device you want to stream from (e.g., a camera).

## Setup Instructions

1. **Google Cloud Setup**:
    - Enable the PubSub and Device Access API in your Google Cloud project.
    - Create OAuth2 credentials (client ID and secret).
    - Update `auth.js` with your client ID, client secret, and project ID.

2. **Configure the Application**:
    - Open the `index.html` file.
    - Update the script source URLs and API keys where needed in the JavaScript files.
    - Ensure the OAuth2 credentials are correctly set in the URL.

3. **Run the Application**:
    - Host the files on a web server (e.g., Apache or Nginx).
    - Call the `index.html` page using a URL with the required parameters (see the example above).
    - Sign in with your Google account to authenticate and start the WebRTC stream.

4. **Logging**:
    - All actions and events are logged using the `logger.js` module.
    - You can view logs in the console or set up a custom logging mechanism.

## Dependencies
- **AWS SDK**: For integration with AWS services.
- **Toastr**: For displaying notifications and errors in the UI.
- **html2canvas**: Used for capturing screenshots.
- **TensorFlow.js and COCO-SSD**: For object detection and people counting in video streams.
- **Google Cloud APIs**: OAuth, Device Access API, and PubSub API.

## License
This project is licensed under the Apache License 2.0. See the [LICENSE](https://www.apache.org/licenses/LICENSE-2.0) file for more details.
