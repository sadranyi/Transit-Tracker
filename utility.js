"use strict"

/**Import pakages and libraries needed */
var __ = require('underscore');
var _ = require('lodash');
var mtz = require('moment-timezone');
var m = require('moment');
var Chance = require('chance');
var constants = require('./constants');
var geo = require('geodist');
var plz = require('pluralize');
var cfg = require('./config');
var gramma = require('grammarray');
var fk =  require('faker');
var minify = require('jsonminify');
var res = require('./resources');
var i18n = require('i18next');
var sprintf = require('i18next-sprintf-postprocessor');

/** Initialize Chance Object */
var ch = new Chance();
var _userLocale = undefined;

var localize = i18n.use(sprintf).init({
    overloadTranslationOptionHandler : sprintf.overloadTranslationOptionHandler,
    returnObjects : true,
    lng : constants.DEFAULTS.LOCALE,
    resources : res }, (err, t) => {
        if(err){ throw new Error('Error Initializing i18next ->>> ' + err);}
        return t;
    });


/** Helper function that looks through provided collection (dataset)
 * for the passed filter and returns the value for the given key
 * @param {object} dataset - The collection of objects
 * @param {string} filter - The lookup value 
 */
function queryGeoCodeJson(dataset, filter){
    return  __.find(dataset,function(set){
        return __.contains(set.types,filter);
    });
}

/** Gets API values from configuration object
 * @param {object} dataset - Collection of API configuration object
 * @param {string} subsetKey - Key identify for the subject to be extracted from configuration object
 * @param {string} values - Key identify for the value needed e.g API_KEY 
 */
function getApiValue(dataset, subsetKey, valueKey){
    var subset = __.has(dataset, subsetKey) ? dataset[subsetKey] : null;
    return !__.isEmpty(subset) && __.has(subset, valueKey) ? subset[valueKey] : undefined;
}

/** Picks a random word from a list or words
 * @param {object} dictionary - dictionary of words
 * @param {string} defaultWord - Default word if the dictionary is empty.
 */
function pickRandomWord(dictionary, defaultWord){
    if(__.isEmpty(dictionary)) return defaultWord;
    var wordIndex = Math.floor(Math.random() * dictionary.length);
    return dictionary[wordIndex];
}

/** Generates SSML code for spelling out numbers  
 * @param {number} number - Number to be spelt out
*/
function spellDigitOutput(number){
    return '<say-as interpret-as="digits">' + number + '</say-as>';
}

/** Determins if collection has a specified property or key
 * @param {object} dataset - Collection, Object or Array
 * @param {string} key - Property to lookup
 */
function hasKey(dataset, key){
    return (!__.isUndefined(dataset) || !__.isNull(dataset)) 
    && !__.isEmpty(dataset) &&  __.has(dataset, key);
}

/** Replaces Parts of Speech Text with other text especially
 * Symbols and None Alphanumeric characters
 * @param {string} textVal - Speech text to searchVal
 * @param {string} searchVal - speech part to lookup
 * @param {string} replaceVal - text to replace searched value
 */
function replaceSpeech(textVal, searchVal, replaceVal){
    return _.replaace(textVal, searchVal, replaceVal);
}

function replaceSpecialCharacters(textVal){
    if(__.isUndefined(textVal) || __.isNull(textVal)) return "";
    return textVal.replace('-', ' ')
    .replace(/&/g, ' and ')
    .replace(/TC\b/g, 'Transit Center')
    .replace('/', ' and ')
    .replace(/Hwy\b/g, 'Highway')
    .replace('"', '')
    .replace(/MPH\b/g, 'Miles per hour')
    .replace(/St\b/g, 'Street')
    .replace(/(Ave|Av)/g, 'Avenue')
    .replace(/Pl\b/g, 'Place')
    .replace(/N\b/g, 'North')
    .replace(/NbE\b/g, 'North by East')
    .replace(/NNE\b/g, 'North North East')
    .replace(/NEbN\b/g, 'North East by North')
    .replace(/NE\b/g, 'North East')
    .replace(/NEbE\b/g, 'North East by East')
    .replace(/ENE\b/g, 'East North East')
    .replace(/EbN\b/g, 'East by North')
    .replace(/E\b/g, 'East')
    .replace(/EbS\b/g, 'East by South')
    .replace(/ESE\b/g, 'East South East')
    .replace(/SEbE\b/g, 'South East by East')
    .replace(/SE\b/g, 'South East')
    .replace(/SEbS\b/g, 'South East by South')
    .replace(/SSE\b/g, 'South South East')
    .replace(/SbE\b/g, 'South by East')
    .replace(/S\b/g, 'South')
    .replace(/SbW\b/g, 'South by West')
    .replace(/SSW\b/g, 'South South West')
    .replace(/SWbS\b/g, 'South West by South')
    .replace(/SW\b/g, 'South West')
    .replace(/SWbW\b/g, 'South West by West')
    .replace(/WSW\b/g, 'West South West')
    .replace(/WbS\b/g, 'West by South')
    .replace(/W\b/g, 'West')
    .replace(/WbN\b/g, 'West by North')
    .replace(/WNW\b/g, 'West North West')
    .replace(/NWbW\b/g, 'North West by West')
    .replace(/NW\b/g, 'North West')
    .replace(/NWbN\b/g, 'North West by North')
    .replace(/NNW\b/g, 'North North West')
    .replace(/NbW\b/g, 'North by West')
    .replace(/Ln\b/g, 'Lane')
}

/** Checks if an object is Null, Undefined or Empty 
 * @param {object} obj - Object to validate
*/
function isNullUndefinedOrEmpty(obj){
    return __.isUndefined(obj) || __.isNull(obj) || __.isEmpty(obj);
}

/** Returns a fake zipCode for help speech */
function getRandomZipCode(){
    return ch.zip();
}

/** Generate Random integer between provided range */
function getRandomNumber(_min, _max){
    return ch.integer({min: _min, max: _max});
}

/** Generate Random US City */
function getRandomUSCity(){
    return fk.address.city();
}

/** Generate Random US State */
function getRandomUSState(){
    return ch.state({full: true, country: 'us'});
}

/** Initialize a new Session attribute if it does not exsits 
     * and assign a default value to it */
function initAttribute(attributeName, defaultvalue){
    this.attributes[attributeName] = defaultvalue;
}

function isNewDevice(){
    return __.isEmpty(this.attributes);
}

function getSessionAttribute(attributeName){
    return this.attributes[attributeName];
}

function setSessionAttribute(attributeName, attributeValue){
    this.attributes[attributeName] = attributeValue;
}

/** Determines if an attribute is present in session*/
function hasAttribute(attributeName){
    return !__.isEmpty(this.attributes) && __.has(this.attributes, attributeName);
}

 /** Determines if Device has been previously setup by ensuring
 * device has persisted attributes for 
 * TIMEZONE, ZIPCODE, CITY, LONGIUDE, LATITUDE
 * SERVICE_NAME, STOP_ID, BUS_ID, ROUTE_ID,
 */
function isReadyDevice(){
    /** Required location Attributes */
    var hasTimeZone = hasKey(this.attributes, constants.ATTRIBUTES.TIMEZONE);
    var hasZipCode = hasKey(this.attributes, constants.ATTRIBUTES.ZIPCODE);
    var hasLatitude = hasKey(this.attributes, constants.ATTRIBUTES.LATITUDE);
    var hasLongitude = hasKey(this.attributes, constants.ATTRIBUTES.LONGIUDE);
    var hasCountry = hasKey(this.attributes, constants.ATTRIBUTES.COUNTRY);
    var hasCountryState = hasKey(this.attributes, constants.ATTRIBUTES.COUNTRY_STATE);
    
    var isLocationReady = hasTimeZone && hasZipCode && hasLatitude && hasLongitude && hasCountry && hasCountryState;

    /** Required Transit Service Provider Attributes */
    var hasServiceName = hasKey(this.attributes, constants.ATTRIBUTES.SERVICE_NAME);
    var hasStopId = hasKey(this.attributes, constants.ATTRIBUTES.STOP_ID);

    var isServiceReady = hasServiceName && hasStopId;

    return isLocationReady && isServiceReady;
}

/** Persists Speech Text into session for use in REPEAT or HELP Intents */
function keepForRepeat(speechOutput, promptOutput){
    this.attributes[constants.ATTRIBUTES.SPEECH_OUTPUT] = speechOutput;
    this.attributes[constants.ATTRIBUTES.PROPMT_OUTPUT] = promptOutput;
}


function clearAttributes (){
    /** Location Attributes */
    var timezone = this.attributes[constants.ATTRIBUTES.TIMEZONE];
    var zipcode = this.attributes[constants.ATTRIBUTES.ZIPCODE];
    var city = this.attributes[constants.ATTRIBUTES.CITY];
    var latitude = this.attributes[constants.ATTRIBUTES.LATITUDE];
    var longitude = this.attributes[constants.ATTRIBUTES.LONGIUDE];
    var country = this.attributes[constants.ATTRIBUTES.COUNTRY];
    var countryState = this.attributes[constants.ATTRIBUTES.COUNTRY_STATE];
    var userLocale = this.attributes[constants.ATTRIBUTES.LOCALE];

    /** Transit Srvice Provider Attributes */
    var serviceName = this.attributes[constants.ATTRIBUTES.SERVICE_NAME];
    var serviceCode = this.attributes[constants.ATTRIBUTES.SERVICE_CODE];
    var stopId = this.attributes[constants.ATTRIBUTES.STOP_ID];
    var busId = this.attributes[constants.ATTRIBUTES.BUS_ID];
    var routeId  = this.attributes[constants.ATTRIBUTES.ROUTE_ID];
    var homeStopName = this.attributes[constants.ATTRIBUTES.HOME_STOP_NAME];
    var agencyId = this.attributes[constants.ATTRIBUTES.AGENCY_ID];

    /** Save last Stop, Route and busId */
    var lastStopId = this.attributes[constants.ATTRIBUTES.LAST_STOP_ID];
    var lastRouteId  = this.attributes[constants.ATTRIBUTES.LAST_ROUTE_ID]; 
    var lastBusId = this.attributes[constants.ATTRIBUTES.LAST_BUS_ID];
    var lastStopName = this.attributes[constants.ATTRIBUTES.LAST_STOP_NAME];

    /** Add all requests stops, buses, routes to favourates */
    var favourateStopIds = this.attributes[constants.ATTRIBUTES.FAVOURATE_STOPS];
    var favourateRouteIds = this.attributes[constants.ATTRIBUTES.FAVOURATE_ROUTES]; 
    var favourateBusIds = this.attributes[constants.ATTRIBUTES.FAVOURATE_BUSES];

    /** Delete all Attributes */
    Object.keys(this.attributes).forEach((attribute) => {
        delete this.attributes[attribute];
    });

    /** Recreate and Assign ONLY Attributes for persistance */
    /** Location Attributes */
    this.attributes[constants.ATTRIBUTES.TIMEZONE] = timezone;
    this.attributes[constants.ATTRIBUTES.ZIPCODE] = zipcode;
    this.attributes[constants.ATTRIBUTES.CITY] = city;
    this.attributes[constants.ATTRIBUTES.LATITUDE] = latitude;
    this.attributes[constants.ATTRIBUTES.LONGIUDE] = longitude;
    this.attributes[constants.ATTRIBUTES.COUNTRY] = country;
    this.attributes[constants.ATTRIBUTES.COUNTRY_STATE] = countryState;
    this.attributes[constants.ATTRIBUTES.LOCALE] = userLocale;

    /** Transit Service Provider Atrributes */
    this.attributes[constants.ATTRIBUTES.SERVICE_NAME] = serviceName;
    this.attributes[constants.ATTRIBUTES.SERVICE_CODE] = serviceCode;
    this.attributes[constants.ATTRIBUTES.STOP_ID] = stopId;
    this.attributes[constants.ATTRIBUTES.BUS_ID] = busId;
    this.attributes[constants.ATTRIBUTES.ROUTE_ID] = routeId;
    this.attributes[constants.ATTRIBUTES.HOME_STOP_NAME] = homeStopName;
    this.attributes[constants.ATTRIBUTES.AGENCY_ID] = agencyId;

    /** Previous Transit Attributes */
    this.attributes[constants.ATTRIBUTES.LAST_STOP_ID] = lastStopId;
    this.attributes[constants.ATTRIBUTES.LAST_ROUTE_ID] = lastRouteId;
    this.attributes[constants.ATTRIBUTES.LAST_BUS_ID] = lastBusId;
    this.attributes[constants.ATTRIBUTES.LAST_STOP_NAME] = lastStopName;

    if (this.handler.state != constants.STATES.SETUPMODE) {
        /** TODO: Change this to create Array Attributes and check if IDs being Added
         * to not already Exists before pushing to Array
         */
        this.attributes[constants.ATTRIBUTES.FAVOURATE_STOPS] = favourateStopIds;
        this.attributes[constants.ATTRIBUTES.FAVOURATE_ROUTES] = favourateRouteIds;
        this.attributes[constants.ATTRIBUTES.FAVOURATE_BUSES] = favourateBusIds;
    }

    this.handler.state = '';
}

/** Create Geodata for calculating distance */
function createGeoCordinates(latitude, longitude){
    var cords = {};
    var hasLatitude = !__.isUndefined(latitude) && !__.isNull(latitude);
    var hasLongitude = !__.isUndefined(longitude) && !__.isNull(longitude);

    if(hasLatitude && hasLongitude){
        cords.lat = latitude;
        cords.lon = longitude;
    } 

    return cords;
}

/** Calculates the distance between two Geo points */
function calculateGeoDistance(fromCords, toCords){
    return geo(fromCords, toCords, {exact: true, unit: 'mi'});
}


/** DEBUG FUNCTION */
function debug(msg, debugType){
    switch (debugType) {
        case constants.ENUM.DEBUG.TYPE.TEXT:
            console.log(`>>>> DEBUG MESSAGE: ${msg} <<<<`);
            break;
        case constants.ENUM.DEBUG.TYPE.JSON:
            console.log(`>>> DEBUG MESSAGE: ${JSON.stringify(msg)} <<<`);
            break;
        default:
            console.log(`>>> DEBUG MESSAGE: ${msg} <<<`);
            break;
    }
}

/** Determines if passed zipcode is valid */
function isValidZipCode(zipcode){
    return !__.isNaN(zipcode) && __.isNumber(zipcode);
}

function isValidNumber(number){
    return !__.isNaN(number) && __.isNumber(number);
}

/** Determine if word should be singular or plural */
function getPlural(word, count){
    return plz(word, count);
}

/** returns user's day of the week based on timezone' */
function getUserDay(usertimezone){
    return mtz().tz(usertimezone).format('dddd');
}

/** Returns user time based on timezone */
function getUsertime(usertimezone){
   return mtz().tz(usertimezone).format();
}

function convertTransitDateTime(datetime, usertimezone){
    return mtz(datetime).tz(usertimezone).format();
}

/** Returns the time of the day based on timezone */
function getUserTimeOfDay(usertimezone){
    var hr = mtz().tz(usertimezone).hour();

    switch (true) {
        case hr < 12:
            return "MORNING";
        case hr <= 16:
            return "AFTERNOON";
        case hr <= 22:
            return "EVENING";
        default:
            return "NIGHT";
    }
}

/** Determines if use is in a serviced Country */
function isServicedCountry(){
    var userCountry = this.attributes[constants.ATTRIBUTES.COUNTRY];
    if(__.isUndefined(userCountry) || __.isNull(userCountry)) return false;
    var servicedCountries = cfg.APP.SERVICE_COUNTRIES;
    var strippedCountry = _.trim(userCountry);
    return !__.isEmpty(servicedCountries) && __.contains(servicedCountries, strippedCountry);
}

/** Returns a well formed string of list from an Array 
 * @param {array} arrayList - Array of list to be split in sentence
*/
function getArraySentence(arrayList)
{
    return gramma(arrayList, {lastDelimiter: ', and '});
}

function getTransitArraySentence(arrayList)
{
    return gramma(arrayList);
}

/** Returns the provider info Stored in config File */
function getServiceDetails(providerList, userCountryState){
    return __.result(providerList, _.upperCase(userCountryState));
}

/** Returns all Keys in a given collection
 * @param {object} datalist - Object collect
 */
function getKeys(datalist){
    return !__.isUndefined(datalist) && !__.isNull(datalist) && !__.isEmpty(datalist) ?
    __.keys(datalist) : null;
}

function hasValidResponse(responseData){
    return !__.isUndefined(responseData) && !__.isNull(responseData) && !__.isEmpty(responseData);
}

/** Adds unique itemds to a given array 
 * @param {Array} dataCollection - dataset to add new Item to
 * @param {object} item - item to be added only once to Array
*/
function addItemOnce(dataCollection, item){
    if(!__.contains(dataCollection, item)){
        dataCollection.push(item);
    }
}

/** function to genrate SSML for say-as 
 * @param {string} ssmlType - the interpret types
 * @param {string} value - the value to be said
 * @returns {string} SSML say-as string
*/
function pronounceAS(ssmlType, value){
    return `<say-as interpret-as="${ssmlType}">${value}</say-as>`;
}

function pronounceAsAudio(mp3Url){
    return `<audio src="${mp3Url}" /> `;
}

/** Returns date part from a unix timestamp 
 * @param {number} timestamp - Unix timestamp
 * @param {string} timezone - the prefered timezone
 * @returns {object} res {date : date, time: time}
*/
function getTimezoneDateTimeFromUnix(timestamp, timezone){
    var res = {};
    var parsedTime = mtz.tz(timestamp, timezone);
    res.time = parsedTime.format(constants.DEFAULTS.TIME_FORMAT);
    res.date = parsedTime.format(constants.DEFAULTS.DATE_FORMAT);
    res.raw = parsedTime.format();
    return res;
}

/** Returns time relative to provided peroids
 * @param {string} usertime - users time (timezone aware)
 * @param {string} eventTime - scheduled or estimated time (timezone aware)
 * @returns {string}  string representation of time difference 
 * in XX minutes
 */
function getTimetoEvent(usertime, eventTime){
    var fromTime = m(usertime);
    var toTime = m(eventTime);

    return fromTime.to(toTime);
}


/** Function to create correct tense for the word arrive 
 * @param {date} usertime - current user timezone
 * @param {date} estimatedTime - estimated arrival timezone
 * @returns {string} proper tense for arrive, arrived if past and arriving is present
*/
function getArrivaltense(usertime, estimatedTime){
    var userUnix =  m(usertime).unix();
    var estUnix = m(estimatedTime).unix();
    return estUnix > userUnix ? 'arriving' : 'arrived';
}

function getArrivalStatus(usertime, scheduledTime, estimatedTime){
    var unixUse = m(usertime).unix();
    var schunix = m(scheduledTime).unix();
    var estUnix = m(estimatedTime).unix();

    switch (true) {
        case estUnix == schunix:
            return "On Time";
        case estUnix > schunix:
            return "Late";
        case schunix > estUnix:
            return "Early"
        default:
            return "Due";
    }
}


/** determines if arrival is delayed */
function isDelayed(scheduledTime, estimatedTime){
    var sch = m(scheduledTime);
    var est = m(estimatedTime);

    var isDelayed = false;
    var delayMins = 0;
    var isDelayedProp = constants.API.PROPERTIES.TRIMET.IS_DELAYED;
    var delayMinsProp = constants.API.PROPERTIES.TRIMET.DELAY_MINUTES;

    var ds = {};
    isDelayed = est > sch;
    delayMins = est.diff(sch, 'minutes', true);

    ds[isDelayedProp] = isDelayed;
    ds[delayMinsProp] = _.round(delayMins);

    return ds;
}


/** Create formated date string for output
 * @param {date} datetime - timespam to format
 * @returns {string} formated date : Today, Friday December 2nd, 2016, at 8:14 am
 */
function formatTransitTimes(datetime, usertimezone){
    return mtz(datetime).tz(usertimezone).calendar(datetime,{
        sameDay: '[Today], dddd MMMM Do, YYYY, [at] h:mm a',
        nextDay: '[Tomorrow], dddd MMMM Do, YYYY, [at] h:mm a',
        nextWeek: '[Next] dddd, MMMM Do, YYYY, [at] h:mm a',
        lastDay: '[Yesterday], dddd MMMM Do, YYYY, [at] h:mm a',
        lastWeek: '[Last] dddd, MMMM Do, YYYY, [at] h:mm a',
        sameElse: 'DD/MM/YYYY'
    });
}


/** Formats Datetime to specifed format.
 * @param {date} datetime - passed date needing formation
 * @param {string} datetimeformat -  date format
 */
function expandDatetime(datetime, datetimeformat){
    return m(datetime).format(datetimeformat);
}

function selectFromJsonResult(dataset, filter){
    var subset =  __.where(dataset, filter);
    return subset;
}


function getObjectKeyByValue(list, searchValue){
    return _.findKey(list, function(val){
        return _.upperCase(_.trim(val)) === _.upperCase(_.trim(searchValue));
    });
}


/** Sets object properties */
function setDirectProperties(dataSet, resultSet, propertyName){
    resultSet[propertyName] = dataSet[propertyName];
}

/** Sets object properties */
function setProperties(resultSet, propertyName, value){
    resultSet[propertyName] = value;
}

/** Sets object properties */
function getProperties(resultSet, propertyName){
    return !__.isNull(resultSet) && !__.isEmpty(resultSet) && __.has(resultSet, propertyName) ? resultSet[propertyName] : null;
}

/** Extracts contents of a given list into a new list */
function combind(dataset, resultSet){
    __.each(dataset, function(value, key, list){
        var context = list[key];

        if(!__.contains(resultSet, context)){
            resultSet.push(_.trim(context));
        }
    });
}

/** Determines if responseData is well formed  */
function isValidJSON(dataset){
    try{
        JSON.parse(dataset);
    } catch (e){
        return false;
    }
    return true;
}

/** Clean and Parse JSON responseData */
function processJsonData(dataset){
    var isGood = hasValidResponse(dataset) && isValidJSON(dataset);
    return isGood ? JSON.parse(dataset) : null;
}

function getIdFromCode(code){
    if(code.toString().indexOf('_') !== -1)
    {
        var length = code.length;
        var index = code.toString().indexOf('_');
        var diff = length - index;
        var start = index + 1;
        return code.substring(start);
    }
    else {
        return code;
    }
}

function getAgencyIdFromStop(stopId){
    if(stopId.toString().indexOf('_') !== -1){
        var length = stopId.length;
        var index = stopId.toString().indexOf('_');
        return stopId.substring(0,index);
    }
    else{
        return stopId
    }
}

function minifyResult(dataset){
    return minify(dataset);
}

function paginate(resultSet, pageSize, page){
    var rs = {};
    var records = resultSet.length;
    var totalPages = _.ceil(records / parseInt(pageSize));
    var currentPage = page > totalPages ? totalPages : page <= 0 ? 1 : page;
    var beginOffset = (parseInt(currentPage) -1) * parseInt(pageSize);
    var endOffset = (parseInt(beginOffset) + parseInt(pageSize));
    var pagedItems = resultSet.slice(beginOffset, endOffset);

    rs[constants.APP.CURRENT_PAGE] = currentPage;
    rs[constants.APP.TOATL_RECORDS] = records;
    rs[constants.APP.TOTAL_PAGES] = totalPages;
    rs[constants.APP.RECORDS_SET] = pagedItems;
    rs[constants.APP.LAST_INDEX] = pagedItems.length - 1;
    rs[constants.APP.ITEM_COUNT] = pagedItems.length;
    
    return rs;
}


function getHoliday(country, date){
    var _country = _.trim(_.upperCase(country));

    var _holidays = {
        "UNITED STATES" : {
            /** Month, Day */
            "M" : {
                "01/01" : "NEW_YEAR",
                "07/04" : "INDEPENDENCE",
                "12/25" : "CHRISTMAS",
                "12/31" : "NEW_YEAR",
                "04/15" : "EMANCIPATION",
                "10/31" : "HALLOWEEN"
            },
            /** Month, Week of Month, Day of Week */
            "W" : {
                "1/3/1" : "MARTIN_LUTHER_KING",
                "2/3/1" : "GEORGE_WASHINGTON",
                "5/5/1" : "MEMORIAL",
                "9/1/1" : "LABOR",
                "10/2/1" : "COLUMBUS",
                "11/4/4" : "THANKS_GIVING",
                "2/3/1" : "PRESIDENTS",
                "5/2/7" : "MOTHERS",
                "6/3/7" : "FATHERS",
                "11/2/5" : "VETERANS"

            },
            /** Month, Week of Month*/
            "X" : {
                "12/2" : "CHRISTMAS",
                "12/3" : "CHRISTMAS",
                "12/4" : "CHRISTMAS"
            }
        }
    };

    var diff = 1+ (0 | (new Date(date).getDate() - 1) / 7);
	var memorial = (new Date(date).getDay() === 1 && (new Date(date).getDate() + 7) > 30) ? "5" : null;

    var _m = _holidays[_country]["M"][m(date).format('MM/DD')];
    var _w = _holidays[_country]["W"][m(date).format('M/'+ (memorial || diff) +'/d')];
    var _x = _holidays[_country]["X"][m(date).format('M/'+ (memorial || diff))];    

    return ( _m || _w || _x);
}


function getSeasonGreetings(userCountry, userTimezone){
    var userDate = getUsertime(userTimezone);
    var season = getHoliday(userCountry, userDate);
    var hasResource = !__.isEmpty(localize.t(season));
    var seasonName = constants.ENUM.HOLIDAYS[season];

    return hasResource ? pickRandomWord(localize.t(season), `Happy ${seasonName} Day`) : "";
}

/** Export for use in other files */
module.exports = {
    queryGeoCodeJson : queryGeoCodeJson,
    getApiValue : getApiValue,
    pickRandomWord : pickRandomWord,
    spellDigitOutput : spellDigitOutput,
    hasKey : hasKey,
    replaceSpeech : replaceSpeech,
    isNullUndefinedOrEmpty , isNullUndefinedOrEmpty,
    getRandomZipCode : getRandomZipCode,
    initAttribute : initAttribute,
    isNewDevice : isNewDevice,
    getSessionAttribute : getSessionAttribute,
    hasAttribute : hasAttribute,
    isReadyDevice : isReadyDevice,
    keepForRepeat : keepForRepeat,
    clearAttributes : clearAttributes,
    createGeoCordinates : createGeoCordinates,
    calculateGeoDistance : calculateGeoDistance,
    replaceSpecialCharacters : replaceSpecialCharacters,
    setSessionAttribute : setSessionAttribute,
    debug : debug,
    isValidZipCode : isValidZipCode,
    getPlural : getPlural,
    getUserDay : getUserDay,
    getUsertime : getUsertime,
    getUserTimeOfDay : getUserTimeOfDay,
    isServicedCountry : isServicedCountry,
    getArraySentence : getArraySentence,
    getServiceDetails :getServiceDetails,
    getKeys : getKeys,
    hasValidResponse : hasValidResponse,
    getRandomNumber : getRandomNumber,
    isValidNumber : isValidNumber,
    getRandomUSCity : getRandomUSCity,
    getRandomUSState : getRandomUSState,
    addItemOnce : addItemOnce,
    pronounceAS : pronounceAS,
    getTimezoneDateTimeFromUnix : getTimezoneDateTimeFromUnix,
    getTimetoEvent : getTimetoEvent,
    getArrivaltense : getArrivaltense,
    formatTransitTimes : formatTransitTimes,
    expandDatetime : expandDatetime,
    convertTransitDateTime : convertTransitDateTime,
    getArrivalStatus : getArrivalStatus,
    getTransitArraySentence : getTransitArraySentence,
    isDelayed : isDelayed,
    selectFromJsonResult : selectFromJsonResult,
    getObjectKeyByValue : getObjectKeyByValue,
    setDirectProperties : setDirectProperties,
    setProperties : setProperties,
    combind : combind,
    getProperties : getProperties,
    isValidJSON : isValidJSON,
    processJsonData : processJsonData,
    getIdFromCode : getIdFromCode,
    getAgencyIdFromStop : getAgencyIdFromStop,
    minifyResult : minifyResult,
    paginate : paginate,
    getHoliday : getHoliday,
    localize : localize,
    pronounceAsAudio : pronounceAsAudio,
    getSeasonGreetings : getSeasonGreetings
}