// config/api.js
const DEV_API_URL = "http://192.168.1.13:3000/api";
const RELEASE_API_URL = "http://192.168.1.13:3000/api"; // Replace with your public production API before store release.

export const API_URL = __DEV__ ? DEV_API_URL : RELEASE_API_URL;