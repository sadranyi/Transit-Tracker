/** Import needed Libraries and packages */
var cfg = require('./config');
var constants = require('./constants');
var ut = require('./utility');
var https = require('https');
var http = require('http');
var mtz = require('moment-timezone');
var m = require('moment');


/** Generic function to generate API URL  baseed on request type
 * @param {constants.API.TYPE} urlType - URL Type constant [GEOCODE | TIMEZONE]
 * @param {object} param - Collections of url parameters [address, lat, lng, city, state]
*/
function generateGoogleUrl(urlType, params){

    /** Get parameters for API Url construction */
    var baseUrl = cfg.API.GOOGLE.BASE_URL;
    var appKey = cfg.API.GOOGLE.APP_KEY;
    var hasParameters = false;

    /** Determine what API URL to generate [TIMEZONE | GEOCODE] */
    switch (urlType) {
        case constants.API.TYPE.GEOCODE:
            return ut.hasKey(params, 'address') ? 
            `${baseUrl}geocode/json?address=${params.address}&key=${appKey}` : null;
        case constants.API.TYPE.TIMEZONE:
            var unixtime = m().unix();
            hasParameters =  ut.hasKey(params, 'lat') && ut.hasKey(params, 'lng');
            return hasParameters ? `${baseUrl}timezone/json?location=${params.lat},${params.lng}&timestamp=${unixtime}&key=${appKey}` : null;
        case constants.API.TYPE.PLACES:
            hasParameters = ut.hasKey(params, 'city') && ut.hasKey(params, 'state');
            return hasParameters ? `${baseUrl}place/autocomplete/json?input=${params.city},${params.state}&types=geocode&key=${appKey}` : null;
        default:
            return null;
    }
}

function generateZipCodeURL(requestType, params){
    var baseUrl = cfg.API.ZIPCODES.BASE_URL;
    var appKey = cfg.API.ZIPCODES.APP_KEY;
    var command = cfg.API.ZIPCODES.COMMAND[requestType];
    var hasParameters = false;
    var returnUrl = undefined;
    var zipcodeParam = cfg.API.ZIPCODES.PARAMETERS.ZIPCODE;
    var unitParam = cfg.API.ZIPCODES.PARAMETERS.UNITS;
    var cityParam = cfg.API.ZIPCODES.PARAMETERS.CITY;
    var stateParam = cfg.API.ZIPCODES.PARAMETERS.STATE;

    switch (requestType) {
        case cfg.API.ZIPCODES.REQUEST_TYPES.GET_LOCATION_FROM_ZIPCODE:
            hasParameters = ut.hasKey(params, zipcodeParam) && ut.hasKey(params, unitParam);
            returnUrl = hasParameters ? `${baseUrl}${appKey}${command}${params[zipcodeParam]}/${params[unitParam]}` : null;
            return returnUrl;
        case cfg.API.ZIPCODES.REQUEST_TYPES.GET_ZIPCODES_FROM_CITY_STATE:
            hasParameters = ut.hasKey(params, cityParam) && ut.hasKey(params, stateParam);
            returnUrl = hasParameters ? `${baseUrl}${appKey}${command}${params[cityParam]}/${params[stateParam]}` : null;
            return returnUrl;
        default:
            return null;
    }
}

/** Generic function to generate BART API URL  baseed on request type
 * @param {constants.API.TYPE} urlType - URL Type constant [ALERTS | ARRIVALS | SCHEDULES]
 * @param {object} param - Collections of url parameters []
 * @returns {object} Transit response Data
*/
function generateBARTUrl(urlType, params){
     /** Get parameters for API Url construction */
    var baseUrl = cfg.API.BART.BASE_URL;
    var appKey = cfg.API.BART.APP_KEY;
    var hasParameters = false;
    var command = undefined;
    var prefix = undefined;
    var suffix = `&key=${appKey}`;
    var url = undefined;
    var query = undefined;
    
    /** Parameter Names*/
    var originParam = constants.API.PARAMETERS.BART.ORIGIN;
    var dateParam = constants.API.PARAMETERS.BART.DATE;

    /** Determine API URL to generate */
    switch (urlType) {
        case constants.API.TYPE.STATIONS:
        case constants.API.TYPE.STOPS:
            command = constants.ENUM.BART.API_CMD.STATIONS;
            prefix = `stn.aspx?cmd=`;
            returnUrl = `${baseUrl}${prefix}${command}${suffix}`;
            return returnUrl;
        case constants.API.TYPE.SCHEDULES:
            command = constants.ENUM.BART.API_CMD.STATION_SCHEDULE;
            prefix = `sched.aspx?cmd=${command}&`;
            hasParameters = ut.hasKey(params, originParam) && ut.hasKey(params, dateParam);
            returnUrl = hasParameters ? `${baseUrl}${prefix}orig=${params[originParam]}&date=${params[dateParam]}${suffix}&l=1` : null;
            return returnUrl;
        case constants.API.TYPE.STATION_DETAILS:
        case constants.API.TYPE.STOP_DETAILS:
            command = constants.ENUM.BART.API_CMD.STATION_INFO;
            prefix = `stn.aspx?cmd=${command}&`;
            hasParameters = ut.hasKey(params, originParam);
            query = `${originParam}=${params[originParam]}`;
            returnUrl = hasParameters ? `${baseUrl}${prefix}${query}${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.ARRIVALS:
            command = constants.ENUM.BART.API_CMD.REAL_TIME_ARRIVALS;
            prefix = `etd.aspx?cmd=${command}&`;
            hasParameters = ut.hasKey(params, originParam);
            returnUrl = hasParameters ? `${baseUrl}${prefix}orig=${params[originParam]}${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.ALERTS:
            command = constants.ENUM.BART.API_CMD.SERVICE_ADVISORY;
            prefix = `bsa.aspx?cmd=${command}&`;
            hasParameters = ut.hasKey(params, originParam) && ut.hasKey(params, dateParam);
            returnUrl = hasParameters ? `${baseUrl}${prefix}orig=${params[originParam]}&date=${params[dateParam]}${suffix}` : null;
            return returnUrl;
        default:
            return null;
    }
}

/** Generic function to generate One Bus Away API URL  baseed on request type
 * @param {constants.API.TYPE} apiType - URL Type constant [ALERTS | ARRIVALS | SCHEDULES]
 * @param {object} param - Collections of url parameters [baseUrl, appKey]
 * @param {string} providerCode  - Transit Provider code [MTA]
 * @returns {object} Transit response Data
*/
function generateOBAUrl(apiType, providerCode, params){
    /** Get parameters for API Url construction */
    var baseUrl = undefined;
    var appKey = undefined;
    var agencyPrefix = undefined;
    var command = undefined;
    var suffix = undefined;
    var returnUrl = undefined;
    var lat = undefined;
    var lon = undefined;
    var radius = undefined;
    var provider = undefined;
    var requestQuery = undefined;
    var stopCode = undefined;
 
    /** Request Parameter Names*/
    var hasParameters = false;
    var latParam = constants.API.PARAMETERS.OBA.LATITUDE;
    var lonParam = constants.API.PARAMETERS.OBA.LONGIUDE;
    var radParam = constants.API.PARAMETERS.OBA.RADIUS;
    var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
    var agencyIdPrama = constants.API.PARAMETERS.OBA.AGENCY_ID;

    /** Prepare request parameters */
    provider = cfg.API[providerCode];
    baseUrl = provider.BASE_URL;
    appKey = provider.APP_KEY;
    radius = provider.SEARCH_RADIUS
    suffix = `key=${appKey}`;

    switch (providerCode) {
        case constants.PROVIDERS.MTA:
            agencyPrefix = cfg.API.MTA.AGENCY_PREFIX;
            break;
        case constants.PROVIDERS.OBA:
        default:
            agencyPrefix = ut.hasKey(params, agencyIdPrama) ? params[agencyIdPrama] : 0;
            break;
    }
    
    /** Determine API URL to generate */
    switch (apiType) {
        case constants.API.TYPE.STOP_DETAILS:
        case constants.API.TYPE.STATION_DETAILS:
            command = constants.ENUM.OBA.API_METHODS.STOP_INFO;
            hasParameters = ut.hasKey(params, stopIdParam);
            stopCode = hasParameters ? ut.getIdFromCode(params[stopIdParam]) : params[stopIdParam];
            requestQuery = hasParameters ? `${agencyPrefix}_${stopCode}` : null;
            returnUrl = hasParameters ? `${baseUrl}${command}${requestQuery}.json?${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.STATIONS:
        case constants.API.TYPE.STOPS:
            command = constants.ENUM.OBA.API_METHODS.STOPS_FOR_LOCATION;
            hasParameters = ut.hasKey(params, latParam) && ut.hasKey(params, lonParam);
            requestQuery = hasParameters ? `${latParam}=${params[latParam]}&${lonParam}=${params[lonParam]}&` : null;
            returnUrl = hasParameters ? `${baseUrl}${command}${requestQuery}${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.SCHEDULES:
            command = constants.ENUM.OBA.API_METHODS.SCHEDULE_FOR_STOP;
            hasParameters = ut.hasKey(params, stopIdParam);
            stopCode = hasParameters ? ut.getIdFromCode(params[stopIdParam]) : params[stopIdParam];
            requestQuery = hasParameters ? `${agencyPrefix}_${stopCode}` : null;
            returnUrl = hasParameters ? `${baseUrl}${command}${requestQuery}.json?${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.ARRIVALS:
        case constants.API.TYPE.ALERTS:
            command = constants.ENUM.OBA.API_METHODS.ARRIVALS_AND_DEPARTURES;
            hasParameters = ut.hasKey(params, stopIdParam);
            stopCode = hasParameters ? ut.getIdFromCode(params[stopIdParam]) : params[stopIdParam];
            requestQuery = hasParameters ? `${agencyPrefix}_${stopCode}` : null;
            returnUrl = hasParameters ? `${baseUrl}${command}${requestQuery}.json?${suffix}` : null;
            return returnUrl;
        case constants.API.TYPE.SERVING_AGENCIES:
            command = constants.ENUM.OBA.API_METHODS.AGENCIES_WITH_COVERAGE;
            returnUrl = `${baseUrl}${command}${suffix}`;
            return returnUrl;
        case constants.API.TYPE.BUSES:
        case constants.API.TYPE.VEHICLES:
        case constants.API.TYPE.TRAINS:
            command = constants.ENUM.OBA.API_METHODS.VEHICLES_FOR_AGENCY;
            hasParameters = ut.hasKey(params, agencyIdPrama);
            requestQuery = hasParameters ? `${params[agencyIdPrama]}` : null;
            returnUrl = hasParameters ? `${baseUrl}${command}${requestQuery}.json?${suffix}` : null;
            return returnUrl;
        default:
            return null;
    }
}

/** Generic function to generate CTA API URL  baseed on request type
 * @param {constants.API.TYPE} apiType - URL Type constant [ALERTS | ARRIVALS | SCHEDULES]
 * @param {object} param - Collections of url parameters [baseUrl, appKey]
 * @returns {object} Transit response Data
*/
function generateCTAUrl(apiType, params){
    var baseUrl = cfg.API.CTA.BASE_URL;
    var appKey = cfg.API.CTA.APP_KEY;
    var suffix = `key=${appKey}`;

    var command = undefined;
    var returnUrl = undefined;
    var lat = undefined;
    var lon = undefined;
    var radius = undefined;
    var provider = undefined;
    var requestQuery = undefined;

    /** Request Parameter Names*/

    /** Determine API URL to generate */
    switch (apiType) {
        case constants.API.TYPE.STATIONS:
        case constants.API.TYPE.STOPS:
        case constants.API.TYPE.SCHEDULES:
        case constants.API.TYPE.ARRIVALS:
        case constants.API.TYPE.ALERTS:
        default:
            return null;
    }
}

/** Generate URL for access Trimet Arrivals API
 * @param {string} stopId - stop Id for which arrivals are needed
*/
function getTrimetArrivalUrl(stopid){
    var baseUrl = cfg.API.TRIMET.ARRIVALS_URL;
    var appKey = cfg.API.TRIMET.APP_KEY;
    return `${baseUrl}${stopid}/appID/${appKey}`;
}

/** Generate URL for access Trimet Stop Locations API 
 * @param {string} lat - latitude for prefered location
 * @param {string} lng - longitude for prefered location
*/
function getTrimetStopsUrl(lat,lng){
    var baseUrl = cfg.API.TRIMET.STOPS_URL;
    var appKey = cfg.API.TRIMET.APP_KEY;
    var distance = cfg.API.TRIMET.STOP_DISTANCE;
    return `${baseUrl}appid/${appKey}/meters/${distance}/ll/${lng},${lat}`;
}

/** Generate URL for access Trimet Detours API 
 * @param {string} routeId - route id for which detours are requested 
*/
function getTrimetDetoursUrl(routeId){
    var baseUrl = cfg.API.TRIMET.DETOURES_URL;
    var appKey = cfg.API.TRIMET.APP_KEY;
    return `${baseUrl}appID/${appKey}/routes/${routeId}`;
}

/** Generic function for making HTTPS Requests
 * @param {string} url prepared api url 
 * @param {function} callbackfnc function that receives the returned data for further processing
 */
function makeHttpsApiCall(url, callbackfnc){
    https.get(url, function(response){
        var responseBody = '';

        /**Accumulate all response data coming in */
        response.on('data', function(data){
            responseBody += data;
        });

        /** pass complete response body to callback function */
        response.on('end', function(){
            callbackfnc(responseBody);
        });
    }).on('error', function(err){
        callbackfnc(null);
    });
}


/** Generic function for making HTTP Requests
 * @param {string} url prepared api url 
 * @param {function} callbackfnc function that receives the returned data for further processing
 */
function makeHttpApiCall(url, callbackfnc){
    http.get(url, function(response){
        var responseBody = '';

        /**Accumulate all response data coming in */
        response.on('data', function(data){
            responseBody += data;
        });

        /** pass complete response body to callback function */
        response.on('end', function(){
            callbackfnc(responseBody);
        });
    }).on('error', function(err){
        callbackfnc(null);
    });
}

/**Generic Function for making API request.
 * @param {object} options - Request options object [host, port, path, method, headers]
 * @param {function} callbackfnc - callback Function that processes the API response
 */
function makeAPIRequest(options, callbackfnc){
    var req = https.request(options, function(response) {
        var responseBody = '';

        /**Accumulate all response data coming in */
        response.on('data', function(data){
            responseBody += data;
        });

        /** pass complete response body to callback function */
        response.on('end', function(){
            callbackfnc(responseBody);
        });
    });

    req.end();
}

/** Calls Google Maps API with request parameters passing 
 * results to callback function for further processing
 * @param {constants.API.TYPE} apiType - determines which API to call [Geocode | Timezone]
 * @param {object} param - request parameter object [address | lat | lng ]
 * @param {function} callbackfnc - function that receives the returbed data for further processing
 */
function getGoogleApiData(apiType, param, callbackfnc){   
    makeHttpsApiCall(generateGoogleUrl(apiType, param), callbackfnc);
}

/** Calls BART API with request parameters passing 
 * results to callback function for further processing
 * @param {constants.API.TYPE} apiType - determines which API to call [STATIONS | ETA]
 * @param {object} param - request parameter object []
 * @param {function} callbackfnc - function that receives the returbed data for further processing
 */
function getBARTApiData(apiType, params, callbackfnc){
    makeHttpsApiCall(generateBARTUrl(apiType, params), callbackfnc);
}

/** Calls BART API with request parameters passing 
 * results to callback function for further processing
 * @param {constants.API.TYPE} apiType - determines which API to call [STATIONS | ETA]
 * @param {object} param - request parameter object []
 * @param {function} callbackfnc - function that receives the returbed data for further processing
 */
function getOBAApiData(apiType, providerCode, params, callbackfnc){
    switch (providerCode) {
        case constants.PROVIDERS.MTA:
            makeHttpsApiCall(generateOBAUrl(apiType, providerCode, params), callbackfnc);
            break;
        case constants.PROVIDERS.OBA:
        default:
            makeHttpApiCall(generateOBAUrl(apiType, providerCode, params), callbackfnc);
            break;
    }
}

/** Return Random Quotes From www.forismatic.com */
function getQuotes(callbackfnc){
    makeHttpApiCall(cfg.API.QUOTES.FORISMATIC.BASE_URL, callbackfnc);
}

/** Returns a random quote from "http://forismatic.com */
function getRandomQuotes(callbackfnc){
    /** Request Options */
    var options = {
        host: cfg.API.QUOTES.BASE_URL,
        port: 443,
        path: '/?cat=famous',
        method: 'POST',
        headers: { 
            'X-Mashape-Key': cfg.API.QUOTES.APP_KEY,
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Accept' : 'application/json'
        }
    };

    var req = https.request(options, function(response) {
        var responseBody = '';

        /**Accumulate all response data coming in */
        response.on('data', function(data){
            responseBody += data;
        });

        /** pass complete response body to callback function */
        response.on('end', function(){
            callbackfnc(responseBody);
        });
    });

    req.end();
}

/** Get Random Facts */
function getRandomFacts(callbackfnc){
    var options = {
        host: cfg.API.FACTS.BASE_URL,
        port: 443,
        path: '/random/trivia?fragment=true&json=true',
        method: 'GET',
        headers: { 
            'X-Mashape-Key': cfg.API.FACTS.APP_KEY,
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Accept' : 'application/json'
        }
    };

    makeAPIRequest(options, callbackfnc);
}


/** Get WEather conditions for passed city */
function getWeatherConditions(city, state, callbackfnc){
    var baseUrl = cfg.API.WEATHER.BASE_URL;
    var key = cfg.API.WEATHER.APP_KEY;
    var url = `${baseUrl}${key}/conditions/q/${state}/${city}.json`;

    makeHttpApiCall(url,callbackfnc);
}

/** Returns user city details based on zipcode used when Google geolocation fails */
function getZipcodesApiData(requestType, params, callbackfnc){
    makeHttpsApiCall(generateZipCodeURL(requestType, params), callbackfnc);
}


/** Generic function to get Trimet API data for passed API types 
 * @param {constants.API.TYPE} apiType - determines which API to call [Geocode | Timezone]
 * @param {object} param - request parameter object [stopId | lat | lng | routeId]
 * @param {function} callbackfnc - function that receives the returbed data for further processing
*/
function getTrimetApiData(apiType, param, callbackfnc){
    switch (apiType) {
        case constants.API.TYPE.ARRIVALS:
            makeHttpsApiCall(getTrimetArrivalUrl(param.stopId), callbackfnc);
            break;
        case constants.API.TYPE.STOPS:
            makeHttpsApiCall(getTrimetStopsUrl(param.lat, param.lng), callbackfnc);
            break;
        case constants.API.TYPE.DETOURES:
            makeHttpsApiCall(getTrimetDetoursUrl(param.routeId), callbackfnc);
            break;
        default:
            break;
    }
}


/** Export for use in other files */
module.exports = {
    getGoogleApiData: getGoogleApiData,
    getTrimetApiData: getTrimetApiData,
    getRandomQuotes : getRandomQuotes,
    makeAPIRequest : makeAPIRequest,
    getRandomFacts : getRandomFacts,
    getWeatherConditions : getWeatherConditions,
    getBARTApiData : getBARTApiData,
    getOBAApiData : getOBAApiData,
    getZipcodesApiData : getZipcodesApiData,
    getQuotes : getQuotes
}