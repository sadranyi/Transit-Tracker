var Alexa = require('alexa-sdk');
var constants = require('./constants');
var ut = require('./utility');
var cfg = require('./config');
var api = require('./api');
var __ = require('underscore');
var _ = require('lodash');
var fmt = require('./formating');
var convert = require('xml2js').parseString;

var setupHandlers = Alexa.CreateStateHandler(constants.STATES.SETUPMODE, {
    /** Stop ID Setup intent Handler */
    'SIdSetupIntent' : function(){
        /** Get Spoken City, State and StopId from Slots */
        var city = this.event.request.intent.slots.city.value;
        var state = this.event.request.intent.slots.state.value;
        var stopId = parseInt(this.event.request.intent.slots.stopid.value);
        var station = this.event.request.intent.slots.station.value;
        var stopIdSpeech = ut.spellDigitOutput(stopId);
        var providedDetails = {};
        var isStationSetup = false;
        var isCityStateValid = false;
        var isStopValid = false;
        var isStationValid = false;
        var isResponseValid = false;

        /** Intent Global Variables */
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);

        /** speech Pauses */
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];

        /** exclamation */
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);

        /** Speech variables */
        var provideDetailsSpeech = "";
        var speechOutput = "";
        var promptSpeech = "";
        var setupNameSpeech = "";

        /** Set Setup type */
        ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_TYPE, constants.ENUM.SETUP_TYPE.STOP_STATION_ID);

        /** Determine where user is setting up with Station ID or Stop ID */
        isCityStateValid = !ut.isNullUndefinedOrEmpty(city) && !ut.isNullUndefinedOrEmpty(state);
        isStopValid = ut.isValidNumber(stopId);
        isStationValid = !ut.isNullUndefinedOrEmpty(station);
        isStationSetup = isStationValid && !isStopValid;

        if(isStationSetup)
            isResponseValid = isCityStateValid && isStationValid;
        else
            isResponseValid = isCityStateValid && isStopValid;
        
        /** determine if provided setup details are valid*/
        if(isResponseValid)
        {
            /** Persist Provided Attributes */
            providedDetails.city = city;
            providedDetails.state = state;

            if(isStationSetup){
                providedDetails.station = station;
                setupNameSpeech = `${station} transit station`;
                ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_ID_TYPE, constants.ENUM.SETUP_ID_TYPE.STATION);
            }
            else{
                 providedDetails.stopId = stopId;
                 setupNameSpeech = `stop ID, ${stopIdSpeech}.`;
                 ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_ID_TYPE, constants.ENUM.SETUP_ID_TYPE.STOP);
            }
               
            /** Persist user response in session attribute for further processing */
            ut.initAttribute.call(this, constants.ATTRIBUTES.PROVIDED_STOP_DETAILS, providedDetails);
            
            provideDetailsSpeech = `${city}, ${shortPause} ${state}, ${setupNameSpeech} `;
            speechOutput = this.t('SETUP_VERIFY_STOP_ID_MESSAGE',goodExclamation, provideDetailsSpeech);
            promptSpeech = this.t('SETUP_VERIFY_STOP_ID_PROMPT', provideDetailsSpeech);

            ut.initAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_ID_SETUP);
            ut.keepForRepeat.call(this, speechOutput, promptSpeech);
            this.emit(':ask', speechOutput, promptSpeech);
        }
        else
        {
            /** Get Limits Left: TotalLimits - attempts made */
            var limit = parseInt(cfg.APP.SETUP_LIMIT); 
            var attempts = parseInt(this.attributes[constants.ATTRIBUTES.SETUP_ATTEMPTS]);
            var allowed = limit - attempts;

            if (attempts > allowed)
            {
                this.emit('EndSession', this.t('SETUP_VERIFY_STOP_ID_LIMIT_MESSAGE'));
            }
            else
            {
                /** Increase zipcode Setup Attemps by 1. end session when >= limit */
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ATTEMPTS, attempts + 1);
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.TRIES_LEFT, allowed - 1);
                var tries = allowed - 1;

                speechOutput = this.t('INVALID_STOP_ID_RESPONSE_MESSAGE', badExclamation, tries, ut.getPlural('attempt', tries));
                promptSpeech = this.t('PROVIDE_NEW_STOP_ID_PROMPT');

                /** Set Session Context */
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.INVALID_STOP_ID_RESPONSE;

                /** Preserve last speech for repeach intent */
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
            } 
        }
    }, 

    /** Zipcode Setup Intent Handler */
    'ZipCodeSetupIntent': function(){
        /** Get Spoken zipcode from user */
        var zipcode = parseInt(this.event.request.intent.slots.zipcode.value);
        ut.initAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME);
        
        /** Intent Variables */
        var speechZip = "";
        var exclamation = "";
        var speechOutput = "";
        var promptSpeech = "";
        var badExclamation = "";
        var goodExclamation = "";
        var attemptsAttr = constants.ATTRIBUTES.SETUP_ATTEMPTS;
        var limtAttr = constants.ATTRIBUTES.SETUP_LIMIT;
        
        /** Set Setup type */
        ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_TYPE, constants.ENUM.SETUP_TYPE.ZIPCODE);

        /** If Invalid zipcode was passed prepare different reponse and call setup again */
        if(ut.isValidZipCode(zipcode))
        {
            // instantiate zipcode attribute and initialize it with the provide zipcode
            ut.initAttribute.call(this, constants.ATTRIBUTES.ZIPCODE, zipcode || 0);
            speechZip = ut.spellDigitOutput(zipcode);
            exclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));

            /** Get Setup Speech from resoure file */
            speechOutput = this.t('SETUP_VERIFY_ZIP_MESSAGE', exclamation, speechZip);
            promptSpeech = this.t('SETUP_VERIFY_ZIP_PROMPT', speechZip);

            /** Set Session Context */
            this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_ZIPCODE;

            /** Preserve last speech for repeach intent */
            ut.keepForRepeat.call(this, speechOutput, promptSpeech);
            this.emit(':ask', speechOutput, promptSpeech);
        }
        else
        {
            /** Get Limits Left: TotalLimits - attempts made */
            var hasLimit = ut.hasAttribute.call(this, limtAttr);
            var hasSetupattempts = ut.hasAttribute.call(this, attemptsAttr);
            
            var limit = hasLimit ? parseInt(this.attributes[limtAttr]) : ut.initAttribute.call(this, limtAttr, cfg.APP.SETUP_LIMIT);
            var attempts = hasSetupattempts ? parseInt(this.attributes[attemptsAttr]) : ut.initAttribute.call(this, attemptsAttr, 0);
            var allowed = limit - attempts;

            if (attempts > allowed)
            {
                this.emit('EndSession', this.t('SETUP_VERIFY_ZIPCODE_LIMIT'));
            }
            else
            {
                /** Increase zipcode Setup Attemps by 1. end session when >= limit */
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ATTEMPTS, attempts + 1);
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.TRIES_LEFT, allowed - 1);
                var tries = allowed - 1;

                exclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
                speechOutput = this.t('INVALID_ZIPCODE_RESPONSE_MESSAGE', exclamation, tries, ut.getPlural('attempt', tries));
                promptSpeech = this.t('PROVIDE_NEW_ZIPCODE_PROMPT');

                /** Set Session Context */
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.INVALID_ZIPCODE_RESPONSE;

                /** Preserve last speech for repeach intent */
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
            } 
        }
    },

    /** user Provided Zipcode to get Google Geocode for useres location */
    'GetGeocode' : function(){
        /** Intent Reference */
        var myIntent = this;
        var currentContex  = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var userZipcode = undefined;
        var speltZipcode = undefined;
        var userLatitude = undefined;
        var userLongitude = undefined;

        /** Default speech if geocode is not found */
        var fakeZipcode = ut.spellDigitOutput(ut.getRandomZipCode());
        var exclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var speechOutput = this.t('NO_GEOCODE_FOUND_MESSAGE', exclamation, userZipcode);
        var promptSpeech = this.t('NO_GEOCODE_FOUND_PROMPT', fakeZipcode, fakeZipcode);
        var speechPause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];

        /** API request types */
        var geocodeApiType = constants.API.TYPE.GEOCODE;
        var timezoneApiType = constants.API.TYPE.TIMEZONE;

        /** API Results Caontainers */
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var userDataSet = {};
        var timezoneSet = {};
        var apiParams = {};

        /** Set Context specific Attributes for API call */
        switch (currentContex) {
            case constants.CONTEXT.VERIFY_ZIPCODE_YES:
                /** get user provided Response for current context [ZIPCODE] needed for API Calls*/
                userZipcode = this.attributes[constants.ATTRIBUTES.ZIPCODE];

                /** user zipzode speech */
                var speltZipcode = ut.spellDigitOutput(userZipcode);

                /** Init API parameters */
                apiParams.address = userZipcode;
                apiParams.lat = "";
                apiParams.lng = "";
                break;
            case constants.CONTEXT.VERIFY_STOP_DETAILS_YES:
                /** get user provided Response for current context [ZIPCODE] needed for API Calls*/
                userLatitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);
                userLongitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);

                /** Init API parameters */
                apiParams.address = `${userLatitude},${userLongitude}`;
                apiParams.lat = userLatitude;
                apiParams.lng = userLongitude;
                break;
            default:
                speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', exclamation);
                this.emit('EndSession', speechOutput);
                break;
        }

        /** Get google geocode and Timezone data for provided zipcode  */
        api.getGoogleApiData(geocodeApiType, apiParams, function(data){

            /** parse returned Data */
            jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;

            /** Determine if API returned Data */
            dataset = !__.isEmpty(jsData) ? jsData[constants.API.PROPERTIES.GEOCODE.RESULT_SET]  : null;
            hasData = !__.isEmpty(dataset) && dataset.length > 0; /** Ensure the dataset is not empty */

            if(hasData) /** Process and Format Found Data */
            {
                /** Process data for current context */
                switch (currentContex) {
                    case constants.CONTEXT.VERIFY_ZIPCODE_YES:
                        /** Extract and process Location Data */
                        userDataSet = fmt.formatLocationData(dataset, "");

                        /** Update API request Parameter with acquired lat, lng values & call Timezone API */
                        apiParams.lat = userDataSet.location.lat;
                        apiParams.lng = userDataSet.location.lng;
                        break;
                    case constants.CONTEXT.VERIFY_STOP_DETAILS_YES:
                        /** Extract and process Zipcode Data */
                        userDataSet = fmt.formatZipCodeData(dataset, "Unknown");

                        /** Set ZIPCODE Sesstion Attribute */
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.ZIPCODE, userDataSet.zipecode);
                        break;
                    default:
                        speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', exclamation);
                        myIntent.emit('EndSession', speechOutput);
                        break;
                }
                
                /** Call the google Timezone API */
                api.getGoogleApiData(timezoneApiType, apiParams, function(data){
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        /** Get Timezone data and create temp Session attribute for user confirmation */
                        userDataSet.timezone = fmt.formatTimezoneData(dataset);

                        /** Process response for current Context */
                        switch (currentContex) {
                            case constants.CONTEXT.VERIFY_ZIPCODE_YES:
                                /** Prepare Temp attributes data */
                                var country = userDataSet.country;
                                var timezone = userDataSet.timezone;
                                var state = userDataSet.state;
                                var lat = userDataSet.location.lat;
                                var lng = userDataSet.location.lng;
                                var city = userDataSet.city;

                                /** Use Zipcode API to get city if Google geocode cant find it */
                                if(__.isNull(city) || __.isEmpty(city))
                                {
                                    var requestType = cfg.API.ZIPCODES.REQUEST_TYPES.GET_LOCATION_FROM_ZIPCODE;
                                    var params = {};
                                    params[cfg.API.ZIPCODES.PARAMETERS.ZIPCODE] = userZipcode;
                                    params[cfg.API.ZIPCODES.PARAMETERS.UNITS] = cfg.API.ZIPCODES.ENUM.UNITS.DEGREES;

                                    api.getZipcodesApiData(requestType, params, function(data){
                                        jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                                        hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                                        if(hasData){
                                            userDataSet.city = jsData[cfg.API.ZIPCODES.PROPERTIES.CITY];
                                            userDataSet.tz = jsData[cfg.API.ZIPCODES.PROPERTIES.TIMEZONE_DATASET][cfg.API.ZIPCODES.PROPERTIES.TIMEZONE_NAME];
                                        }

                                        /** create temporary session attribute to hold current location  */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_ADDRESS, userDataSet);

                                        var msgIntro = myIntent.t('ADDRESS_FOUND_INTRO', goodExclamation, speltZipcode, userDataSet.city, state, country);
                                        var msgDetails = myIntent.t('ADDRESS_FOUND_DETAILS');

                                        speechOutput = `${msgIntro} ${speechPause} ${msgDetails}`;
                                        promptSpeech = myIntent.t('VERIFY_YES_OR_NO');

                                        myIntent.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_LOCATION;
                                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                    });
                                }
                                else
                                {
                                    /** create temporary session attribute to hold current location  */
                                    ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_ADDRESS, userDataSet);

                                    var msgIntro = myIntent.t('ADDRESS_FOUND_INTRO', goodExclamation, speltZipcode, city, state, country);
                                    var msgDetails = myIntent.t('ADDRESS_FOUND_DETAILS');

                                    speechOutput = `${msgIntro} ${speechPause} ${msgDetails}`;
                                    promptSpeech = myIntent.t('VERIFY_YES_OR_NO');

                                    myIntent.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_LOCATION;
                                    ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                    myIntent.emit(':ask', speechOutput, promptSpeech);
                                }
                                break;
                            case constants.CONTEXT.VERIFY_STOP_DETAILS_YES:
                                /** Persist user TIMEZONE */
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TIMEZONE, userDataSet.timezone);

                                /** Change Application mode to START and Provide user with sample utterances */
                                myIntent.handler.state = constants.STATES.STARTMODE;
                                var stopDetails = ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_STOP_DETAILS);
                                var skillName = myIntent.t('SKILL_NAME');
                                var serviceProviderCode = ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE);
                                var stopName = undefined;

                                switch (serviceProviderCode) {
                                    case constants.PROVIDERS.OBA:
                                        stopName = ut.replaceSpecialCharacters(stopDetails[constants.API.PROPERTIES.OBA.NAME]);
                                        break;
                                    case constants.PROVIDERS.MTA:
                                        stopName = ut.replaceSpecialCharacters(stopDetails.stopName);
                                        break;
                                    case constants.PROVIDERS.TRIMET:
                                    default:
                                        stopName = stopDetails[constants.API.PROPERTIES.TRIMET.DESCRIPTION];
                                        break;
                                }

                                var intro = myIntent.t('STOP_VERIFIED_INTRO', goodExclamation, stopName, 'stop');
                                var msg = myIntent.t('STOP_VERIFIED_MESSAGE', skillName);

                                speechOutput = `${intro}${speechPause}${msg}${speechPause}`;
                                myIntent.emit('EndSession', speechOutput);
                                break;
                            default:
                                speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', exclamation);
                                myIntent.emit('EndSession', speechOutput);
                                break;
                        }
                    }
                    else
                    {
                        switch (currentContex) {
                            case constants.CONTEXT.VERIFY_ZIPCODE_YES:
                            case constants.CONTEXT.VERIFY_STOP_DETAILS_YES:
                            default:
                                speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', exclamation);
                                myIntent.emit('EndSession', speechOutput);
                                break;
                        }
                    }
                });
            }
            else
            {   
                switch (currentContex) {
                    case constants.CONTEXT.VERIFY_ZIPCODE_YES:
                    case constants.CONTEXT.VERIFY_STOP_DETAILS_YES:
                    default:
                        speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', exclamation);
                        myIntent.emit('EndSession', speechOutput);
                        break;
                }
            }
        });
    },

    'GetOBAStopData' : function(){
        /** Intent Reference */
        var myIntent = this;

        /** get Current context to determine the right reponse for API Calls */
        var currentContex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var provider_code = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
        var currentItem = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM);
        var setupType = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_TYPE);

        /** Intent Global variables */
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));

        /** Speech variables */
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var speechOutput = "";
        var promptSpeech = "";

        /** Session Attributes */
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;
        var longitudeAttr = constants.ATTRIBUTES.LONGIUDE;
        var latitudeAttr = constants.ATTRIBUTES.LATITUDE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var serviceNameAttr = constants.ATTRIBUTES.SERVICE_NAME;

        /** Properties  */
        var agencyProp = constants.API.PROPERTIES.OBA.AGENCY_ID;
        var longitudeProp = constants.API.PROPERTIES.OBA.LONGIUDE;
        var latitudeProp = constants.API.PROPERTIES.OBA.LATITUDE;
        var nameProp = constants.API.PROPERTIES.OBA.NAME;

        /** Request Parameter Names*/
        var latParam = constants.API.PARAMETERS.OBA.LATITUDE;
        var lonParam = constants.API.PARAMETERS.OBA.LONGIUDE;
        var radParam = constants.API.PARAMETERS.OBA.RADIUS;
        var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
        var agencyIdPrama = constants.API.PARAMETERS.OBA.AGENCY_ID;

        var userStopId = undefined;
        var userLatitude = undefined;
        var userLongitude = undefined;
        var agencyId = undefined;
        var stopName = undefined;
        var routes = undefined;

        /** API request params */
        var apiParams = {};
        var apiType = undefined;

        /** API Results Caontainers */
        var jsData = null;
        var dataset = null;
        var listDataSet = null;
        var hasData = false;
        
        switch (currentContex) {
            case constants.CONTEXT.VERIFY_AGENCY_YES:
            default:
                switch (setupType) {
                    case constants.ENUM.SETUP_TYPE.STOP_STATION_ID:
                        userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                        agencyId = currentItem[agencyProp]

                        apiType = constants.API.TYPE.STOP_DETAILS;
                        apiParams[stopIdParam] = userStopId;
                        apiParams[agencyIdPrama] = agencyId;

                        /** Retrieve and Process user Stop */
                        api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                            jsData = ut.processJsonData(data);
                            dataset = jsData[constants.API.PROPERTIES.OBA.DATA];
                            hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                            if(hasData)
                            {
                                var formatedStation = fmt.formatOBAStops(dataset);
                                var speech = fmt.speakOBAStopsAndRoutes(formatedStation);
                                var providerName = ut.replaceSpecialCharacters(ut.getSessionAttribute.call(myIntent, serviceNameAttr));

                                /** Persist service details in session for confirmation in YES/NO Intent */
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_STOP_DETAILS, formatedStation);

                                var speechOutput = myIntent.t('FOUND_STOP_STATION_DETAILS_MESSAGE', goodExclamation, 'Stop', speech, providerName);
                                var promptSpeech = myIntent.t('FOUND_STOP_STATION_DETAILS_PROMPT');

                                ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_DETAILS);
                                ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                myIntent.emit(':ask', speechOutput, promptSpeech);
                            }
                            else
                            {
                                /** Get Limits Left: TotalLimits - attempts made */
                                var limit = parseInt(cfg.APP.SETUP_LIMIT); 
                                var attempts = parseInt(ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.SETUP_ATTEMPTS));
                                var allowed = parseInt(limit) - parseInt(attempts);

                                if (attempts > allowed)
                                {
                                    myIntent.emit('EndSession', myIntent.t('SETUP_VERIFY_STOP_ID_LIMIT_MESSAGE'));
                                }
                                else
                                {
                                    /** Increase zipcode Setup Attemps by 1. end session when >= limit */
                                    ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.SETUP_ATTEMPTS, attempts + 1);
                                    ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.TRIES_LEFT, allowed - 1);
                                    var tries = parseInt(allowed) - 1;


                                    speechOutput = myIntent.t('INVALID_STOP_ID_RESPONSE_MESSAGE', badExclamation, tries, ut.getPlural('attempt', tries));
                                    promptSpeech = myIntent.t('PROVIDE_NEW_STOP_ID_PROMPT');

                                    /** Set Session Context */
                                    myIntent.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.INVALID_STOP_ID_RESPONSE;

                                    /** Preserve last speech for repeach intent */
                                    ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                    myIntent.emit(':ask', speechOutput, promptSpeech);
                                } 
                            }
                        });
                        break;
                    case constants.ENUM.SETUP_TYPE.ZIPCODE:
                        agencyId = currentItem[agencyProp];
                        userLongitude = currentItem[longitudeProp];
                        userLatitude = currentItem[latitudeProp];

                        apiType = constants.API.TYPE.STOPS;
                        apiParams[agencyIdPrama] = agencyId;
                        apiParams[lonParam] = userLongitude;
                        apiParams[latParam] = userLatitude;

                        api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                            jsData = ut.processJsonData(data);
                            dataset = jsData[constants.API.PROPERTIES.OBA.DATA];
                            hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                            if(hasData)
                            {
                                listDataSet = dataset[constants.API.PROPERTIES.OBA.LIST];
                                var hasStops = !__.isEmpty(listDataSet);

                                if(hasStops)
                                {
                                    var foundStops = fmt.formatOBAStopsForAgency(dataset, agencyId);

                                    if(!__.isNull(foundStops) && !__.isEmpty(foundStops)){
                                        var stopCount = foundStops.length;
                                        var currentStopIndex = 0;
                                        var currentStop = foundStops[currentStopIndex];
                                        var stopPluralSpeech = ut.getPlural("stop", stopCount);

                                        /** Paginate to avoid response size overload */
                                        var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                        var page = ut.paginate(foundStops, pageSzie, 1);
                                        var pagedResultSet = page[constants.APP.RECORDS_SET];
                                        var totalPages = page[constants.APP.TOTAL_PAGES];
                                        var currentPage = page[constants.APP.CURRENT_PAGE];
                                        var totalRecords = page[constants.APP.TOATL_RECORDS];
                                        var lastIndex = page[constants.APP.LAST_INDEX];

                                        /** Store Sorted Stops in Temporary Collection for user navigation via Next and Previous Utterances */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                                        
                                        var stopName = ut.replaceSpecialCharacters(currentStop[nameProp]);
                                        var stopSpeech = fmt.speakOBAStopsAndRoutes(currentStop);

                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, currentStop);

                                        /** Add Paging Attributes */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                        /** Prepare Speech output */
                                        var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, "Stop");
                                        var intro = myIntent.t('STOP_FOUND_INTRO', goodExclamation, stopCount, stopPluralSpeech);
                                        var msg = myIntent.t('STOP_FOUND_MESSAGE', "stop");

                                        var speech = `${intro} ${midPause} ${msg}. ${midPause} ${stopSpeech},`;
                                        speechOutput = `${speech}. ${midPause} ${confirmStopSpeech}`;
                                        promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', "stop");

                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                        ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                    }
                                    else
                                    {
                                        speechOutput = myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation);
                                        myIntent.emit('EndSession', speechOutput);
                                    } 
                                }
                                else
                                {
                                    speechOutput = myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation);
                                    myIntent.emit('EndSession', speechOutput);
                                }
                            }
                            else
                            {
                                speechOutput = myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation);
                                myIntent.emit('EndSession', speechOutput);
                            }
                        });
                        break;
                    default:
                        speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                        this.emit('EndSession', speechOutput);
                        break;
                }
                break;
        }
    },

    /** Use Confirmed location Data to get Service information [Stops, Buses, Routes]*/
    'GetServiceData' : function(){
        /** Intent Reference */
        var myIntent = this;

        /** Current user response persisited in session attributes */
        var usercountry = this.attributes[constants.ATTRIBUTES.COUNTRY];
        var userCountryState = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY_STATE);
        var userSetupIdType = undefined;
        var userStation = undefined;
        var userStopId = undefined;
        var userLatitude = undefined;
        var userLongitude = undefined;

        /** Intent Global variables */
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var fakeZipcode = ut.spellDigitOutput(ut.getRandomZipCode());

        /** Service Providers related variales from config file */
        var serviceProvidersList = cfg.APP.SERVICE_PROVIDERS;
        var servicedcountrySpeech = ut.getArraySentence(cfg.APP.SERVICE_COUNTRIES);
        var servicedStatesList = ut.getKeys(cfg.APP.SERVICE_PROVIDERS);
        var servicedStatesSpeech = ut.getArraySentence(servicedStatesList);
        var serviceProviderDetails = ut.getServiceDetails(serviceProvidersList, userCountryState);

        /** Speech Pauses */
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];

        /** API request params */
        var apiParams = {};
        var apiType = undefined;

        /** API Results Caontainers */
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var availableStops = {};
        var availableStations = undefined;
        var avaialableStationsCount = 0;
        var availableStopsCount = 0;
        var stationServiceDetails = undefined
        var stopServiceDetails = undefined;
        var subSet = undefined;

        /** get Current context to determine the right reponse for API Calls */
        var currentContex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);

        /** Determine if user is in serviced country */
        var inServicedCountry = ut.isServicedCountry.call(this);

        /** set default Speech for when user country is not serviced */
        var intro = this.t('COUNTRY_NOT_SERVICED_INTRO', badExclamation, usercountry);
        var msg = this.t('COUNTRY_NOT_SERVICED_MESSAGE', servicedcountrySpeech);
        var details = this.t('COUNTRY_NOT_SERVICED_DETAILS');

        var speechOutput = `${intro} ${pause} ${msg} ${pause} ${details}`;
        var promptSpeech = this.t('COUNTRY_NOT_SERVICED_PROMPT');
        var stopsSpeech = "";
        var stationPluralSpeech = "";

        if(inServicedCountry)
        {
            /** determine if users state is serviced */
            var hasProvderCode = ut.hasKey(serviceProviderDetails, constants.APP.PROVIDER_CODE);

            if(hasProvderCode)
            {
                var provider_code = serviceProviderDetails[constants.APP.PROVIDER_CODE];
                var provider_desc = serviceProviderDetails[constants.APP.PROVIDER_DESCRIPTION];
                var msg = `I have not implemented APIs for ${provider_desc}`;

                /** Setup API request variables based on context */
                switch (currentContex) {
                    case constants.CONTEXT.VERIFY_LOCATION_YES:
                        /** Get Context specific session Attributes */
                        userLatitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);
                        userLongitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);

                        /** Prepare parameters for API Request*/
                        apiType = constants.API.TYPE.STOPS;
                        apiParams.stopId = "";
                        apiParams.routeId = "";
                        apiParams.lat = userLatitude;
                        apiParams.lng = userLongitude;
                        break;
                    case constants.CONTEXT.VERIFY_COUNTRY_YES:
                         /** Get Context specific session Attributes and prepare api request parameters*/
                         userSetupIdType = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ID_TYPE);

                        if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STATION)
                        {   /** get user provided station */
                            userStation = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STATION_ID);
                        }
                        else
                        {
                            userStopId = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STOP_ID);
                            apiType = constants.API.TYPE.ARRIVALS
                            apiParams.stopId = userStopId
                        }
                        break;
                    default:
                        speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                        this.emit('EndSession', speechOutput);
                        break;
                }

                /** Get Stops Closest to user, save in temporary Collection */
                switch (provider_code) {
                    case constants.PROVIDERS.TRIMET:
                        /** Call Trimet Stop API for avaialable stops */
                        api.getTrimetApiData(apiType, apiParams, function(data){
                            jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                            dataset = !__.isEmpty(jsData) ? jsData[constants.API.PROPERTIES.TRIMET.RESULT_SET] : null;

                            subSet = constants.API.PROPERTIES.LOCATION;
                            hasData = !__.isEmpty(dataset) && __.has(dataset, subSet) && (dataset[subSet]).length > 0;

                            if(hasData)
                            {
                                /** respond accordingly based on context */
                                switch (currentContex) {
                                    case constants.CONTEXT.VERIFY_LOCATION_YES:
                                        /** get Available stops */
                                        availableStops = dataset[constants.API.PROPERTIES.LOCATION];
                                        availableStopsCount = availableStops.length;
                                        stopsSpeech = ut.getPlural("stop", availableStopsCount);

                                        /** Create Coordinate for distance Calculation */
                                        var userCords = ut.createGeoCordinates(userLatitude, userLongitude);
                                        var sortedStopList = fmt.addDistanceSortTrimet(availableStops, userCords);

                                        /** Paginate to avoid response size overload */
                                        var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                        var page = ut.paginate(sortedStopList, pageSzie, 1);
                                        var pagedResultSet = page[constants.APP.RECORDS_SET];
                                        var totalPages = page[constants.APP.TOTAL_PAGES];
                                        var currentPage = page[constants.APP.CURRENT_PAGE];
                                        var totalRecords = page[constants.APP.TOATL_RECORDS];
                                        var lastIndex = page[constants.APP.LAST_INDEX];

                                        /** Store Sorted Stops in Temporary Collection for user navigation via Next and Previous Utterances */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, pagedResultSet[0]);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_NAME, provider_desc);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AGENCY_ID, 0);

                                        /** Add Paging Attributes */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                        var speechProcess = fmt.formatTrimetStopLocation(ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP));
                                        var stopSpeech = speechProcess.speech;
                                        var stopName = speechProcess.stopName;

                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);

                                        /** PERSIST THIS FOR EACH SELECTION */
                                        var stopId = speechProcess.stopId;
                                        var routesId = speechProcess.routes;
                                        var busIds = speechProcess.buses;

                                        var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, "stop");

                                        /** Prepare Speech output */
                                        var intro = myIntent.t('STOP_FOUND_INTRO', goodExclamation, availableStopsCount, stopsSpeech);
                                        var msg = myIntent.t('STOP_FOUND_MESSAGE', "stop");

                                        speechOutput = `${intro} ${pause} ${msg}. ${stopSpeech} ${pause} ${confirmStopSpeech}`;
                                        promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', "stop");

                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                        ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                        break;
                                    case constants.CONTEXT.VERIFY_COUNTRY_YES:
                                        /** get the stop details */
                                        var longProp = constants.API.PROPERTIES.LONGIUDE;
                                        var latProp = constants.API.PROPERTIES.LATITUDE;
                                        var descProp = constants.API.PROPERTIES.TRIMET.DESCRIPTION;
                                        var serviceNameAttr = constants.ATTRIBUTES.SERVICE_NAME;
                                        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;

                                        var location = dataset[constants.API.PROPERTIES.LOCATION][0];
                                        var arrivalDataset = dataset[constants.API.PROPERTIES.TRIMET.ARRIVAL];

                                        /** Get Stop Details */
                                        stopServiceDetails = fmt.formatFoundStop(location, provider_code);

                                        /** Get all routes and buses for stop */
                                        var routes_buses = fmt.formatFoundTrimetRoutesAndBuses(arrivalDataset);

                                        stopServiceDetails[constants.ATTRIBUTES.ROUTE_ID] = routes_buses.routes;
                                        stopServiceDetails[constants.ATTRIBUTES.BUS_ID] = routes_buses.buses;
                                        stopServiceDetails[serviceNameAttr] = provider_desc;
                                        stopServiceDetails[serviceCodeAttr] = provider_code;

                                        var latitude = stopServiceDetails[latProp];
                                        var longitude = stopServiceDetails[longProp];
                                        var stopName = ut.replaceSpecialCharacters(stopServiceDetails[descProp]);

                                        /** Persist service details in session for confirmation in YES/NO Intent */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_STOP_DETAILS, stopServiceDetails);
                                        ut.initAttribute.call(myIntent, serviceCodeAttr, provider_code);
                                        ut.initAttribute.call(myIntent, serviceNameAttr, provider_desc);

                                        speechOutput = myIntent.t('FOUND_STOP_STATION_DETAILS_MESSAGE', goodExclamation, 'stop', stopName, ut.replaceSpecialCharacters(provider_desc));
                                        promptSpeech = myIntent.t('FOUND_STOP_STATION_DETAILS_PROMPT');
 
                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_DETAILS);
                                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                        break;
                                    default:
                                        speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                        myIntent.emit('EndSession', speechOutput);
                                        break;
                                }
                            }
                            else
                            {
                                /** respond accordingly based on context */
                                switch (currentContex) {
                                    case constants.CONTEXT.VERIFY_LOCATION_YES:
                                    case constants.CONTEXT.VERIFY_COUNTRY_YES:
                                    default:
                                        speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                        myIntent.emit('EndSession', speechOutput);
                                        break;
                                }
                            }
                        });
                        break;
                    case constants.PROVIDERS.BART:
                        /** BART Paramters & properties */
                        var originParam = constants.API.PARAMETERS.BART.ORIGIN;
                        var stationList = cfg.API.BART.STATIONS;
                        var resultSetProp = constants.API.PROPERTIES.BART.RESULT_SET;
                        var stationsProp = constants.API.PROPERTIES.BART.STATIONS;
                        var stationsDataSetProp = constants.API.PROPERTIES.BART.STATION;
                        var cityProp = constants.API.PROPERTIES.BART.CITY;
                        var stateProp = constants.API.PROPERTIES.BART.STATE;
                        var zipProp = constants.API.PROPERTIES.BART.ZIPCODE;
                        var nameProp = constants.API.PROPERTIES.BART.NAME;
                        var latitudeProp = constants.API.PROPERTIES.BART.LATITUDE;
                        var longitudeProp = constants.API.PROPERTIES.BART.LONGIUDE;
                        var introProp = constants.API.PROPERTIES.BART.INTRO;
                        var stationProp = constants.API.PROPERTIES.BART.STATION;
                        var abbrProp = constants.API.PROPERTIES.BART.ABBR;
                        var addressProp = constants.API.PROPERTIES.BART.ADDRESS;
                        var northRouteProp = constants.API.PROPERTIES.BART.NORTH_ROUTES;
                        var southRouteProp = constants.API.PROPERTIES.BART.SOUTH_ROUTES;
                        var northPlatformProp = constants.API.PROPERTIES.BART.NORTH_PLATFORMS;
                        var southPlatformProp = constants.API.PROPERTIES.BART.SOUTH_PLATFORMS;
                        var platformIntroProp = constants.API.PROPERTIES.BART.PLATFORM_INFO;

                        switch (currentContex) {
                            case constants.CONTEXT.VERIFY_COUNTRY_YES:
                                /** Get User station code from BART Station List from Config File */
                                var foundStationCode = ut.getObjectKeyByValue(stationList, userStation);

                                /** Set API type and Request parameters */
                                apiType = constants.API.TYPE.STATION_DETAILS;
                                apiParams[originParam] = foundStationCode;

                                if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STATION)
                                {
                                    /** Get Station details for user provied station */
                                    api.getBARTApiData(apiType, apiParams, function(data){
                                        convert(data, {explicitArray : false}, function(err, res){
                                            /** Get Station Details */
                                            dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                                            stationServiceDetails = fmt.formatFoundStop(dataset, provider_code);

                                            /** Persist found Station information */
                                            stationServiceDetails[constants.ATTRIBUTES.SERVICE_NAME] = provider_desc;
                                            stationServiceDetails[constants.ATTRIBUTES.SERVICE_CODE] = provider_code;
                                            stationServiceDetails[constants.ATTRIBUTES.ROUTE_ID] = stationServiceDetails.routes;
                                            stationServiceDetails[constants.ATTRIBUTES.BUS_ID] = stationServiceDetails.platforms;
                                            var stationName = ut.replaceSpecialCharacters(stationServiceDetails[nameProp]);
                                        
                                            /** Persist service details in session for confirmation in YES/NO Intent */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_STOP_DETAILS, stationServiceDetails);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AGENCY_ID, 0);

                                            speechOutput = myIntent.t('FOUND_STOP_STATION_DETAILS_MESSAGE', goodExclamation, 'station', stationName, provider_desc);
                                            promptSpeech = myIntent.t('FOUND_STOP_STATION_DETAILS_PROMPT');
    
                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STATION_DETAILS);
                                            ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                            myIntent.emit(':ask', speechOutput, promptSpeech);
                                        });
                                    });
                                }
                                else if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STOP)
                                {
                                    speechOutput = this.t('STOPS_NOT_SUPPORTED_BY_PROVIDER', badExclamation, provider_desc);
                                    this.emit('EndSession', speechOutput);
                                }
                                else
                                {
                                    speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                    this.emit('EndSession', speechOutput);
                                }
                                break;
                            case constants.CONTEXT.VERIFY_LOCATION_YES:
                                api.getBARTApiData(apiType, apiParams, function(data){
                                    convert(data, {explicitArray : false}, function(err, res){
                                        dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                                        hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                                        if(hasData)
                                        {
                                            availableStations = dataset;
                                            avaialableStationsCount = availableStations.length;
                                            stationPluralSpeech = ut.getPlural("station", avaialableStationsCount);

                                            /** Filter stations return to only ones with user zipcode and City */
                                            var userCity = ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.CITY);
                                            var userZipcode = ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.ZIPCODE);

                                            /** Prepare Filter  */
                                            var filter = {};
                                            filter[cityProp] = _.trim(userCity);
                                            filter[zipProp] = _.trim(userZipcode);

                                            /** Get Filtered Stations closest to user based on infered City and ZipCode */
                                            var filteredStationList = ut.selectFromJsonResult(availableStations, filter);
                                            var filteredStationListCount = filteredStationList.length || 0;
                                            var currentStation = filteredStationList[0];

                                            /** Paginate to avoid response size overload */
                                            var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                            var page = ut.paginate(filteredStationList, pageSzie, 1);
                                            var pagedResultSet = page[constants.APP.RECORDS_SET];
                                            var totalPages = page[constants.APP.TOTAL_PAGES];
                                            var currentPage = page[constants.APP.CURRENT_PAGE];
                                            var totalRecords = page[constants.APP.TOATL_RECORDS];
                                            var lastIndex = page[constants.APP.LAST_INDEX];

                                            /** Store Sorted Stops in Temporary Collection for user navigation via Next and Previous Utterances */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, 0);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_NAME, provider_desc);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AGENCY_ID, 0);

                                            /** Add Paging Attributes */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                            var foundStation = fmt.speakBARTStationLocation(currentStation);
                                            var NameAndAddressspeech = foundStation.speech;
                                            var stationName = foundStation.name;
                                            var stationId = foundStation.stopId;
                                            var address = foundStation.address;

                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_NAME, stationName);

                                            /** Prepare parameters to get Station details */
                                            var type = constants.API.TYPE.STATION_DETAILS
                                            var param = {};
                                            param[originParam] = stationId;

                                            api.getBARTApiData(type, param, function(data){
                                                convert(data, {explicitArray : false}, function(err, res){
                                                    dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                                                    hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                                                    if(hasData)
                                                    {
                                                        var stationDetails = fmt.formatFoundStop(dataset, provider_code);
                                                        var northRoutes = stationDetails[northRouteProp];
                                                        var southRoutes = stationDetails[southRouteProp];
                                                        var northPlatforms = stationDetails[northPlatformProp];
                                                        var southPlatforms = stationDetails[southPlatformProp];
                                                        var intro = stationDetails[introProp];
                                                        var platformInfo = stationDetails[platformIntroProp];

                                                        /** Add Station details to current station object in Session */
                                                        currentStation[northRouteProp] = northRoutes;
                                                        currentStation[southRouteProp] = southRoutes;
                                                        currentStation[northPlatformProp] = northPlatforms;
                                                        currentStation[southPlatformProp] = southPlatforms;
                                                        currentStation[introProp] = intro;
                                                        currentStation[platformIntroProp] = platformInfo;

                                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, currentStation);

                                                        /** Prepare Speech output */
                                                        var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stationName, "station");
                                                        var intro = myIntent.t('STOP_FOUND_INTRO', goodExclamation, filteredStationListCount, stationPluralSpeech);
                                                        var msg = myIntent.t('STOP_FOUND_MESSAGE', "station");

                                                        /** Get formated details speech */
                                                        var formatSpeech = fmt.speakStopAndStationDetails(stationDetails, provider_code);
                                                        var speech = `${intro} ${midPause} ${msg}. ${midPause} ${formatSpeech},`;

                                                        speechOutput = `${speech}. ${midPause} ${confirmStopSpeech}`;
                                                        promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', "station");

                                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                                        ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                                    }
                                                    else
                                                    {
                                                        speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                                        myIntent.emit('EndSession', speechOutput);
                                                    }
                                                });
                                            });
                                        }
                                        else
                                        {
                                            speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                            myIntent.emit('EndSession', speechOutput);
                                        }
                                    });
                                });
                                break;
                            default:
                                speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                this.emit('EndSession', speechOutput);
                                break;
                        }
                        break;
                    case constants.PROVIDERS.OBA:
                        var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
                        var dataProp = constants.API.PROPERTIES.OBA.DATA;
                        var longProp = constants.API.PROPERTIES.OBA.LONGIUDE;
                        var latProp = constants.API.PROPERTIES.OBA.LATITUDE;
                        var descProp = constants.API.PROPERTIES.OBA.DESCRIPTION;
                        var nameProp = constants.API.PROPERTIES.OBA.NAME;
                        var codeProp = constants.API.PROPERTIES.OBA.CODE;
                        var directionProp = constants.API.PROPERTIES.OBA.DIRECTION;
                        var agencyProp = constants.API.PROPERTIES.OBA.AGENCY;
                        var timezoneProp = constants.API.PROPERTIES.OBA.TIMEZONE;
                        var longNameProp = constants.API.PROPERTIES.OBA.LONG_NAME;
                        var shortNameProp = constants.API.PROPERTIES.OBA.SHORT_NAME;
                        var idProp = constants.API.PROPERTIES.OBA.ID;
                        var routesProp = constants.API.PROPERTIES.OBA.ROUTES;
                        var stopsProp = constants.API.PROPERTIES.OBA.STOPS;

                        var foundAgencies = undefined;
                        var agencyPluralSpeech = undefined;
                        var confirmAgencySpeech = undefined;
                        var foundAgenciesCount = 0;
                        var currentAgency = undefined;
                        var firstAgencyIndex = 0;
                        var lastAgencyIndex = 0;
                        var currentAgencyIndex = 0;
                        
                        switch (currentContex) {
                            case constants.CONTEXT.VERIFY_COUNTRY_YES:
                                if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STATION)
                                {
                                    speechOutput = this.t('STATIONS_NOT_SUPPORTED_BY_PROVIDER', badExclamation, provider_desc);
                                    this.emit('EndSession', speechOutput);
                                }
                                else if (userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STOP)
                                {
                                    apiParams[stopIdParam] = userStopId;
                                    apiType = constants.API.TYPE.SERVING_AGENCIES;

                                    /** Get list of all Agencies serving the region */
                                    api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                                        jsData = ut.processJsonData(data);
                                        hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                                        if(hasData)
                                        {
                                            foundAgencies = fmt.formatAgenciesCovered(jsData);
                                            foundAgenciesCount = foundAgencies.length;
                                            currentAgency = foundAgencies[currentAgencyIndex];
                                            lastAgencyIndex = foundAgenciesCount - 1;

                                            /** Paginate to avoid response size overload */
                                            var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                            var page = ut.paginate(foundAgencies, pageSzie, 1);
                                            var pagedResultSet = page[constants.APP.RECORDS_SET];
                                            var totalPages = page[constants.APP.TOTAL_PAGES];
                                            var currentPage = page[constants.APP.CURRENT_PAGE];
                                            var totalRecords = page[constants.APP.TOATL_RECORDS];
                                            var lastIndex = page[constants.APP.LAST_INDEX];
                                            
                                            /** Create navigation Attributes */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.ITEMS_COLLECTION, pagedResultSet);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM, currentAgency);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_ITEM_INDEX, firstAgencyIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_ITEM_INDEX, lastIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, currentAgencyIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);

                                            /** Add Paging Attributes */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                            /** Prepare Speech output */
                                            var agencyName = ut.replaceSpecialCharacters(currentAgency[nameProp]);
                                            agencyPluralSpeech = ut.getPlural("Agency", foundAgenciesCount);
                                            confirmAgencySpeech = myIntent.t('USE_AS_DEFAULT_AGENCY_MESSAGE', agencyName);
                                            
                                            var intro = myIntent.t('AGENCY_FOUND_INTRO', goodExclamation, foundAgenciesCount, agencyPluralSpeech);
                                            var msg = myIntent.t('AGENCY_FOUND_MESSAGE');

                                            speechOutput = `${intro} ${pause} ${msg}. ${pause} ${agencyName} ${pause} ${confirmAgencySpeech}`;
                                            promptSpeech = myIntent.t('USE_AS_DEFAULT_AGENCY_PROMPT');

                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                                            ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                            myIntent.emit(':ask', speechOutput, promptSpeech);
                                        }
                                        else
                                        {
                                            speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                            myIntent.emit('EndSession', speechOutput);
                                        }
                                    });
                                }
                                else
                                {
                                    speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                    this.emit('EndSession', speechOutput);
                                }
                                break;
                            case constants.CONTEXT.VERIFY_LOCATION_YES:
                                apiParams[stopIdParam] = userStopId;
                                apiType = constants.API.TYPE.SERVING_AGENCIES;

                                /** Get list of all Agencies serving the region */
                                api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                                    jsData = ut.processJsonData(data);
                                    hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                                    if(hasData)
                                    {
                                            foundAgencies = fmt.formatAgenciesCovered(jsData);
                                            foundAgenciesCount = foundAgencies.length;
                                            currentAgency = foundAgencies[currentAgencyIndex];
                                            lastAgencyIndex = foundAgenciesCount - 1;

                                            /** Paginate to avoid response size overload */
                                            var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                            var page = ut.paginate(foundAgencies, pageSzie, 1);
                                            var pagedResultSet = page[constants.APP.RECORDS_SET];
                                            var totalPages = page[constants.APP.TOTAL_PAGES];
                                            var currentPage = page[constants.APP.CURRENT_PAGE];
                                            var totalRecords = page[constants.APP.TOATL_RECORDS];
                                            var lastIndex = page[constants.APP.LAST_INDEX];
                                            
                                            /** Create navigation Attributes */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.ITEMS_COLLECTION, pagedResultSet);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM, currentAgency);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_ITEM_INDEX, firstAgencyIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_ITEM_INDEX, lastIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, currentAgencyIndex);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);

                                            /** Add Paging Attributes */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                            /** Prepare Speech output */
                                            var agencyName = ut.replaceSpecialCharacters(currentAgency[nameProp]);
                                            agencyPluralSpeech = ut.getPlural("Agency", foundAgenciesCount);
                                            confirmAgencySpeech = myIntent.t('USE_AS_DEFAULT_AGENCY_MESSAGE', agencyName);
                                            
                                            var intro = myIntent.t('AGENCY_FOUND_INTRO', goodExclamation, foundAgenciesCount, agencyPluralSpeech);
                                            var msg = myIntent.t('AGENCY_FOUND_MESSAGE');

                                            speechOutput = `${intro} ${pause} ${msg}. ${pause} ${agencyName} ${pause} ${confirmAgencySpeech}`;
                                            promptSpeech = myIntent.t('USE_AS_DEFAULT_AGENCY_PROMPT');

                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                                        ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                        myIntent.emit(':ask', speechOutput, promptSpeech);
                                    }
                                    else
                                    {
                                        speechOutput = myIntent.t('NO_SERVICE_PROVIDERS', badExclamation);
                                        myIntent.emit('EndSession', speechOutput);
                                    }
                                });
                                break;
                            default:
                                break;
                        }
                        break;
                    case constants.PROVIDERS.MTA:
                        /** Common MTA_OBA Parameters and Property Variables  */
                        var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
                        var dataProp = constants.API.PROPERTIES.OBA.DATA;
                        var longProp = constants.API.PROPERTIES.OBA.LONGIUDE;
                        var latProp = constants.API.PROPERTIES.OBA.LATITUDE;
                        var descProp = constants.API.PROPERTIES.OBA.DESCRIPTION;
                        var nameProp = constants.API.PROPERTIES.OBA.NAME;
                        var codeProp = constants.API.PROPERTIES.OBA.CODE;
                        var directionProp = constants.API.PROPERTIES.OBA.DIRECTION;
                        var agencyProp = constants.API.PROPERTIES.OBA.AGENCY;
                        var timezoneProp = constants.API.PROPERTIES.OBA.TIMEZONE;
                        var longNameProp = constants.API.PROPERTIES.OBA.LONG_NAME;
                        var shortNameProp = constants.API.PROPERTIES.OBA.SHORT_NAME;
                        var idProp = constants.API.PROPERTIES.OBA.ID;
                        var routesProp = constants.API.PROPERTIES.OBA.ROUTES;
                        var stopsProp = constants.API.PROPERTIES.OBA.STOPS;

                        switch (currentContex) 
                        {
                            case constants.CONTEXT.VERIFY_COUNTRY_YES:
                                if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STATION)
                                {
                                    speechOutput = this.t('STATIONS_NOT_SUPPORTED_BY_PROVIDER', badExclamation, provider_desc);
                                    this.emit('EndSession', speechOutput);
                                }
                                else if(userSetupIdType === constants.ENUM.SETUP_ID_TYPE.STOP)
                                {
                                    
                                    apiParams[stopIdParam] = userStopId;
                                    apiType = constants.API.TYPE.STATION_DETAILS;

                                    /** get Stop Details for Passed Stop */
                                    api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                                        jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                                        hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                                        /** Process returned Stop Details */
                                        if(hasData)
                                        {
                                            dataset = jsData[dataProp];
                                            stopServiceDetails = fmt.formatFoundStop(dataset, provider_code);
                                            var stopName = stopServiceDetails.stopName;

                                            /** Persist found Station information */
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_STOP_DETAILS, stopServiceDetails);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_NAME, stopServiceDetails.routes[0].agencyName);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AGENCY_ID, stopServiceDetails.routes[0].agencyId);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LATITUDE, stopServiceDetails.latitude);
                                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LONGIUDE, stopServiceDetails.longitude);

                                            speechOutput = myIntent.t('FOUND_STOP_STATION_DETAILS_MESSAGE', goodExclamation, 'Stop', stopName, provider_desc);
                                            promptSpeech = myIntent.t('FOUND_STOP_STATION_DETAILS_PROMPT');

                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_DETAILS);
                                            ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                            myIntent.emit(':ask', speechOutput, promptSpeech);
                                        }
                                        else
                                        {
                                            speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                            myIntent.emit('EndSession', speechOutput);
                                        }
                                    });
                                }
                                else
                                {
                                    speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                    this.emit('EndSession', speechOutput);
                                }
                                break;
                            case constants.CONTEXT.VERIFY_LOCATION_YES:
                                /** Prepare parameters for API Request*/
                                apiType = constants.API.TYPE.STOPS;
                                apiParams.stopId = "";
                                apiParams.routeId = "";
                                apiParams[latProp] = userLatitude;
                                apiParams[longProp] = userLongitude;

                                var foundStopDetails = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FOUND_STOP_DETAILS);
                                var foundLongitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);
                                var foundLatitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);

                                api.getOBAApiData(apiType, provider_code, apiParams, function(data){
                                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                                    dataset = jsData[dataProp][stopsProp];
                                    hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                                    if(hasData)
                                    {
                                        availableStops = dataset;
                                        availableStopsCount = availableStops.length;
                                        var stopPluralSpeech = ut.getPlural("Stop", availableStopsCount);

                                        /** use geolocation to calculate distance closest to user */
                                        var userCords = ut.createGeoCordinates(userLatitude, userLongitude);
                                        var sortedStopList = fmt.addDistanceSortOBA(availableStops, userCords);
                                        var currentStop = sortedStopList[0];
                                        var sortedStopListCount = sortedStopList.length;

                                        /** Paginate to avoid response size overload */
                                        var pageSzie = cfg.APP.DEFAULTS.PAGE_SIZE;
                                        var page = ut.paginate(sortedStopList, pageSzie, 1);
                                        var pagedResultSet = page[constants.APP.RECORDS_SET];
                                        var totalPages = page[constants.APP.TOTAL_PAGES];
                                        var currentPage = page[constants.APP.CURRENT_PAGE];
                                        var totalRecords = page[constants.APP.TOATL_RECORDS];
                                        var lastIndex = page[constants.APP.LAST_INDEX];

                                        /** Store Sorted Stops for user navigation via Next and Previous Utterances */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, currentStop);

                                        /** Add Paging Attributes */
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.PAGE_SIZE, pageSzie);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_PAGES, totalPages);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, currentPage);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.TOTAL_RECORDS, totalRecords);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_RECORD, 1);

                                        var processStop = fmt.formatFoundStop(currentStop, provider_code);
                                        var stopDetailsSpeech = fmt.speakStopAndStationDetails(processStop, provider_code, "Stop");
                                        var stopName = processStop.stopName;

                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_NAME, processStop.routes[0].agencyName);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AGENCY_ID, processStop.routes[0].agencyId);

                                        var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, "stop");
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);

                                        /** Prepare Speech output */
                                        var intro = myIntent.t('STOP_FOUND_INTRO', goodExclamation, sortedStopListCount, stopPluralSpeech);
                                        var msg = myIntent.t('STOP_FOUND_MESSAGE', "stop");

                                        speechOutput = `${intro} ${pause} ${msg}. ${stopDetailsSpeech} ${pause} ${confirmStopSpeech}`;
                                        promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', "stop");
                                        
                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                                        myIntent.emit(':ask', speechOutput);
                                    }
                                    else
                                    {
                                        speechOutput = myIntent.t('NO_STOP_FOUND_MESSAGE', badExclamation);
                                        myIntent.emit('EndSession', speechOutput);
                                    }
                                });
                                break;
                            default:
                                this.emit('EndSession', msg);
                                break;
                        }
                        break;
                    case constants.PROVIDERS.CTA:
                        this.emit('EndSession', msg);
                        break;
                    default:
                        speechOutput = this.t('PROVIDERS_COMING_SOON', badExclamation);
                        this.emit('EndSession', speechOutput);
                        break;
                }
            }
            else 
            {
                var intro = this.t('STATE_NOT_SERVICED_INTRO', badExclamation, userCountryState);
                var msg = this.t('STATE_NOT_SERVICED_MESSAGE', servicedStatesSpeech);
                speechOutput = `${intro} ${pause} ${msg}`;
                promptSpeech = this.t('SETUP_DEVICE_PROMPT');

                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.SERVICE_NOT_AVAILABLE;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
            }
        }
        else
        {
            this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.SERVICE_NOT_AVAILABLE;
            ut.keepForRepeat.call(this, speechOutput, promptSpeech);
            this.emit(':ask', speechOutput, promptSpeech);
        }
    },

    'GetTimeZone' : function(){
        /** Get Intent Reference */
        var myIntent = this;

        /** Speech Variables */
        var pause = constants.BREAKTIME['150'];      
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var speechOutput = undefined;
        var promptSpeech = undefined;

        /** Property names */
        var latProp = constants.API.PROPERTIES.LATITUDE;
        var lngProp = constants.API.PROPERTIES.LONGIUDE;
        var timzoneIdProp = constants.API.PROPERTIES.TIMEZONE.TIMEZONE_ID;

        /** Attribute Names */
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;

        /** API Request Parameters */
        var apiType = constants.API.TYPE.TIMEZONE;
        var jsData = undefined;
        var dataset = undefined;
        var hasData = false;

        var latitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);
        var longitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);
        var stopName = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME);

        var apiParams = {};
        apiParams[latProp] = latitude;
        apiParams[lngProp] = longitude;

        api.getGoogleApiData(apiType, apiParams, function(data){
            jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
            hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

            if(hasData)
            {
                dataset = jsData;
                var usertimezone = ut.getProperties(dataset, timzoneIdProp);
                ut.initAttribute.call(myIntent, timezoneAttr, usertimezone);

                var skillName = myIntent.t('SKILL_NAME');
                var msg_1 = myIntent.t('STOP_VERIFIED_INTRO', goodExclamation, stopName, 'Station');
                var msg_2 = myIntent.t('STOP_VERIFIED_MESSAGE', skillName);

                speechOutput = `${msg_1} ${pause} ${msg_2}`; 
                myIntent.emit('EndSession', speechOutput); 
            }
            else
            {
                speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                myIntent.emit('EndSession', speechOutput);
            }
        });
    },

    /** Get user COUNTRY, from passed city and State */
    'GetLocationFromStop' : function(){
        /** Get intent reference for use in API call */
        var myIntent = this;
        var fakeStop = ut.spellDigitOutput(ut.getRandomNumber(10,200));
        var fakeState = ut.getRandomUSState();
        var fakeCity = ut.getRandomUSCity();
        var pause = constants.BREAKTIME['100'];
        var longPause = constants.BREAKTIME['350'];        
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));

        /** Get user provided Response from session attributes */
        var userCity = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CITY);
        var userState = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY_STATE);
        var userCityStateSpeech = `${userCity}${pause}${userState}`;
        var fakeCityStateStopIdSpeech = `${fakeCity}${pause}${fakeState}${pause}${fakeStop}`;

        /** Default response with UNKNOW or COUNTRY_NOT_FOUND message */
        var speechOutput = this.t('NO_COUNTRY_FOUND_MESSAGE', badExclamation, userCityStateSpeech);
        var promptSpeech = this.t('NO_COUNTRY_FOUND_MESSAGE', fakeCityStateStopIdSpeech);

        /** API Request Parameters */
        var apiType = constants.API.TYPE.PLACES;
        var jsData = undefined;
        var dataset = undefined;
        var hasData = false;
        var country = "Unknown";

        var params = {};
        params.city = userCity;
        params.state = userState;

        api.getGoogleApiData(apiType, params, function(data){
            jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
            hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

            if(hasData)
            {
                dataset = jsData[constants.API.PROPERTIES.PLACES.RESULT_SET][0];
                country = fmt.formatPlace(dataset);

                speechOutput = myIntent.t('COUNTRY_FOUND_MESSAGE', goodExclamation, userCity, userState, country);
                promptSpeech = myIntent.t('VERIFY_YES_OR_NO');

                /** Set Session Atttribute for found Country */
                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FOUND_COUNTRY, country);

                ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_COUNTRY);
                ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                myIntent.emit(':ask', speechOutput, promptSpeech);
            }
            else
            {
                ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.NO_COUNTRY_FOUND);
                ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                myIntent.emit(':ask', speechOutput, promptSpeech);
            }
        });
    },

    'AMAZON.YesIntent' : function(){
        /** Determine context of session and respond accordingly */
        switch (this.attributes[constants.ATTRIBUTES.CONTEXT]) {
            case constants.CONTEXT.VERIFY_ZIPCODE:
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_ZIPCODE_YES;
                this.emitWithState('GetGeocode');
                break;
            case constants.CONTEXT.VERIFY_LOCATION:
                /** Get VERIFY_LOCATION from FOUND_ADDRESS attribute */
                var vloc = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FOUND_ADDRESS);
        
                /** initialize the required attributes and proceed to finding service provider */
                ut.initAttribute.call(this, constants.ATTRIBUTES.TIMEZONE, vloc.timezone);
                ut.initAttribute.call(this, constants.ATTRIBUTES.LATITUDE, vloc.location.lat);
                ut.initAttribute.call(this, constants.ATTRIBUTES.LONGIUDE, vloc.location.lng);
                ut.initAttribute.call(this, constants.ATTRIBUTES.COUNTRY, vloc.country);
                ut.initAttribute.call(this, constants.ATTRIBUTES.COUNTRY_STATE, vloc.state);
                ut.initAttribute.call(this, constants.ATTRIBUTES.CITY, vloc.city || "Unknown");
                
                /** Set Session context */
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_LOCATION_YES;
                this.emitWithState('GetServiceData');
                break;
            case constants.CONTEXT.VERIFY_AGENCY:
            case constants.CONTEXT.NEXT_ITEM:
            case constants.CONTEXT.PREVIOUS_ITEM:
            case constants.CONTEXT.FIRST_ITEM_INDEX:
            case constants.CONTEXT.LAST_ITEM_INDEX:
                var currentAgency = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM);
                var providedStopDetails = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.PROVIDED_STOP_DETAILS);
                var provider_code = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
                var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
                var skillName = this.t('SKILL_NAME');
                var pause =  constants.BREAKTIME['150'];
                var intro = undefined;
                var msg = undefined;
                var agencyName = undefined;
                var agencyId = undefined;
                var latitude = undefined;
                var longitude = undefined;
                var timezone = undefined;
                var speechOutput = "";
                var pronptSpeech = "";

                /**Properties */
                var nameProp = constants.API.PROPERTIES.OBA.NAME;
                var timezoneProp = constants.API.PROPERTIES.OBA.TIMEZONE;
                var agencyIdProp =constants.API.PROPERTIES.OBA.AGENCY_ID;
                var latProp = constants.API.PROPERTIES.OBA.LATITUDE;
                var lonprop = constants.API.PROPERTIES.OBA.LONGIUDE;

                switch (provider_code) {
                    case constants.PROVIDERS.OBA:
                    agencyName = ut.replaceSpecialCharacters(currentAgency[nameProp]);
                    agencyId = currentAgency[agencyIdProp];
                    latitude = currentAgency[latProp];
                    longitude = currentAgency[lonprop];
                    timezone = currentAgency[timezoneProp];

                    ut.initAttribute.call(this, constants.ATTRIBUTES.TIMEZONE, timezone);
                    ut.initAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE, provider_code);
                    ut.initAttribute.call(this, constants.ATTRIBUTES.SERVICE_NAME, agencyName);
                    ut.initAttribute.call(this, constants.ATTRIBUTES.AGENCY_ID, agencyId);
                    ut.initAttribute.call(this, constants.ATTRIBUTES.LONGIUDE, longitude);
                    ut.initAttribute.call(this, constants.ATTRIBUTES.LATITUDE, latitude);

                    ut.initAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY_YES);
                    this.emitWithState('GetOBAStopData');
                    default:
                        break;
                }
                break;
            case constants.CONTEXT.VERIFY_STOP:
            case constants.CONTEXT.MOVE_NEXT:
            case constants.CONTEXT.MOVE_PREVIOUS:
            case constants.CONTEXT.LAST_STOP_INDEX:
            case constants.CONTEXT.FIRST_STOP_INDEX:
                /** Collect current Stop details and Persisit in session Attributes.
                 * Prompt user to ask for Arrivals, Delays, Schedules and Detours
                 */
                var savedResponse = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP);
                var serviceProvider = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
                var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
                var skillName = this.t('SKILL_NAME');
                var pause =  constants.BREAKTIME['150'];
                var intro = undefined;
                var msg = undefined;
                var speechOutput = "";
                var pronptSpeech = "";

                switch (serviceProvider) {
                    case constants.PROVIDERS.TRIMET:
                        /** Extract saved user selected stop or station */
                        var speechProcess = fmt.formatTrimetStopLocation(savedResponse);
                        var stopSpeech = speechProcess.speech;
                        var stopName = speechProcess.stopName;
                        var stopId = speechProcess.stopId;
                        var routesId = speechProcess.routes;
                        var busIds = speechProcess.buses;

                        /** Set Session Attributes */
                        ut.initAttribute.call(this, constants.ATTRIBUTES.STOP_ID, stopId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.ROUTE_ID, routesId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.BUS_ID, busIds);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME, stopName);

                        intro = this.t('STOP_VERIFIED_INTRO', goodExclamation, stopName, 'stop');
                        msg = this.t('STOP_VERIFIED_MESSAGE', skillName);

                        var speechOutput = `${intro} ${pause} ${msg}`;
                        this.emit('EndSession', speechOutput);
                        break;
                    case constants.PROVIDERS.BART:
                        /** Extract Saved Response */
                        var stationName = savedResponse[constants.API.PROPERTIES.BART.NAME];
                        var stationId = savedResponse[constants.API.PROPERTIES.BART.ABBR];
                        var northRoutes = savedResponse[constants.API.PROPERTIES.BART.NORTH_ROUTES];
                        var southRoutes = savedResponse[constants.API.PROPERTIES.BART.SOUTH_ROUTES];
                        var northPlatforms = savedResponse[constants.API.PROPERTIES.BART.NORTH_PLATFORMS];
                        var southPlatforms = savedResponse[constants.API.PROPERTIES.BART.SOUTH_PLATFORMS];
                        var stationIntro = savedResponse[constants.API.PROPERTIES.BART.INTRO];
                        var platformInfo = savedResponse[constants.API.PROPERTIES.BART.PLATFORM_INFO];

                        var stationNameSpeech = ut.replaceSpecialCharacters(stationName);
                        var introSpeech = ut.replaceSpecialCharacters(stationIntro);
                        var platformIntroSpeech = ut.replaceSpecialCharacters(platformInfo);

                        var routes = [];
                        var platforms = [];

                        ut.combind(northRoutes, routes);
                        ut.combind(southRoutes, routes);
                        ut.combind(northPlatforms, platforms)
                        ut.combind(southPlatforms, platforms)

                        /** Set Session Attributes */
                        ut.initAttribute.call(this, constants.ATTRIBUTES.STOP_ID, stationId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.ROUTE_ID, routes);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.BUS_ID, platforms);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME, stationNameSpeech);

                        intro = this.t('STOP_VERIFIED_INTRO', goodExclamation, stationNameSpeech, 'station');
                        msg = this.t('STOP_VERIFIED_MESSAGE', skillName);

                        var speechOutput = `${intro}. ${pause} ${introSpeech}.${pause} ${msg}`;
                        this.emit('EndSession', speechOutput);
                        break;
                    case constants.PROVIDERS.MTA:
                        /** Set Session Attributes */
                        var stopDetails = fmt.formatFoundStop(savedResponse, serviceProvider);
                        var stopName = stopDetails.stopName;

                        ut.initAttribute.call(this, constants.ATTRIBUTES.STOP_ID, stopDetails.stopId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.ROUTE_ID, stopDetails.routeId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.BUS_ID, stopDetails.busIds);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME, stopName);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.TIMEZONE, stopDetails.timezone);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE, serviceProvider);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.SERVICE_NAME, stopDetails.routes[0].agencyName);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.AGENCY_ID, stopDetails.routes[0].agencyId);
                        
                        intro = this.t('STOP_VERIFIED_INTRO', goodExclamation, stopName, 'stop');
                        msg = this.t('STOP_VERIFIED_MESSAGE', skillName);

                        var speechOutput = `${intro}. ${pause} ${msg}`;
                        this.emit('EndSession', speechOutput);
                        break;
                    case constants.PROVIDERS.OBA:
                        var nameProp = constants.API.PROPERTIES.OBA.NAME;
                        var stopIdProp = constants.API.PROPERTIES.OBA.CODE;
                        var routesProp = constants.API.PROPERTIES.OBA.ROUTE_IDS;

                        var stopName = ut.replaceSpecialCharacters(savedResponse[nameProp]);
                        var stopId = savedResponse[stopIdProp];
                        var routes = savedResponse[routesProp];
                        var buses = [];

                        ut.initAttribute.call(this, constants.ATTRIBUTES.STOP_ID, stopId);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.ROUTE_ID, routes);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME, stopName);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.BUS_ID, buses);

                        intro = this.t('STOP_VERIFIED_INTRO', goodExclamation, stopName, 'stop');
                        msg = this.t('STOP_VERIFIED_MESSAGE', skillName);

                        var speechOutput = `${intro}. ${pause} ${msg}`;
                        this.emit('EndSession', speechOutput);
                        break;
                    default:
                        this.emit('EndSession', 'Something went wrong, please try again');
                        break;
                }
                break;
            case constants.CONTEXT.VERIFY_STOP_ID_SETUP:
                /** Get Provided Stop Details from Session Attribute */
                var stopDetails = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.PROVIDED_STOP_DETAILS);
                var setupIdType = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ID_TYPE);

                /** Initialize Session Attributes for passed Details [STOP_ID, CITY, STATE] */
                ut.initAttribute.call(this, constants.ATTRIBUTES.CITY, stopDetails.city || "Unknown");
                ut.initAttribute.call(this, constants.ATTRIBUTES.COUNTRY_STATE, stopDetails.state);

                /** Set Appropriate Setup type id  */
                if(setupIdType === constants.ENUM.SETUP_ID_TYPE.STATION){
                    ut.initAttribute.call(this, constants.ATTRIBUTES.STATION_ID, stopDetails.station);
                }else{
                     ut.initAttribute.call(this, constants.ATTRIBUTES.STOP_ID, stopDetails.stopId);
                }
               
                /** Set Session context */
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_STOP_ID_SETUP_YES;
                this.emitWithState('GetLocationFromStop');
                break;
            case constants.CONTEXT.VERIFY_COUNTRY:
                var foundCountry = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FOUND_COUNTRY);
                ut.initAttribute.call(this, constants.ATTRIBUTES.COUNTRY, foundCountry);
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_COUNTRY_YES;
                this.emitWithState('GetServiceData');
                break;
            case constants.CONTEXT.VERIFY_STOP_DETAILS:
                /** Get verified stop details */
                var verifiedStopDetails = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FOUND_STOP_DETAILS);
                var serviceproviderCode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
                var userLongitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);
                var userLatitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);

                /** Session Attribute Names */
                var serviceNameAttr = constants.ATTRIBUTES.SERVICE_NAME;
                var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
                var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;
                var busIdAttr = constants.ATTRIBUTES.BUS_ID;
                var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
                var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
                var longitudeAttr = constants.ATTRIBUTES.LONGIUDE;
                var latitudeAttr = constants.ATTRIBUTES.LATITUDE;
                var stopNameAttr = constants.ATTRIBUTES.HOME_STOP_NAME;
                var stopIdAttr = constants.ATTRIBUTES.STOP_ID;

                var latitude = undefined;
                var longitude = undefined;
                var stopName = undefined;
                var ServiceName = undefined;
                var busIds = undefined;
                var routeIds = undefined; 
                var timezone = undefined;
                var serviceCode = undefined;
                var agencyId = undefined;
                var routes = undefined;
                var stopId = undefined;

                switch (serviceproviderCode) {
                    case constants.PROVIDERS.OBA:
                        stopName = verifiedStopDetails[constants.API.PROPERTIES.OBA.NAME];
                        routeIds = verifiedStopDetails[constants.API.PROPERTIES.OBA.ROUTE_IDS];
                        stopId = verifiedStopDetails[constants.API.PROPERTIES.OBA.ID];
                        busIds = [];

                        ut.setSessionAttribute.call(this, routeIdAttr, routeIds);
                        ut.setSessionAttribute.call(this, stopNameAttr, ut.replaceSpecialCharacters(stopName));
                        ut.setSessionAttribute.call(this, stopIdAttr, stopId);
                        ut.setSessionAttribute.call(this, busIdAttr, busIds);
                        break;
                    case constants.PROVIDERS.MTA:
                        latitude = verifiedStopDetails.latitude;
                        longitude = verifiedStopDetails.longitude;
                        stopName = verifiedStopDetails.stopName;
                        serviceName = verifiedStopDetails.routes[0].agencyName;
                        serviceCode = serviceproviderCode;
                        agencyId = verifiedStopDetails.routes[0].agencyId;
                        busIds = verifiedStopDetails.busIds;
                        routeIds = verifiedStopDetails.routeId;
                        timezone = verifiedStopDetails.timezone;

                        /** Persist verified STOP and Service Details */
                        ut.setSessionAttribute.call(this, longitudeAttr, longitude);
                        ut.setSessionAttribute.call(this, latitudeAttr, latitude);
                        ut.setSessionAttribute.call(this, busIdAttr, busIds);
                        ut.setSessionAttribute.call(this, routeIdAttr, routeIds);
                        ut.setSessionAttribute.call(this, stopNameAttr, stopName);
                        ut.setSessionAttribute.call(this, timezoneAttr, timezone);
                        ut.setSessionAttribute.call(this, serviceNameAttr, serviceName);
                        ut.setSessionAttribute.call(this, serviceCodeAttr, serviceCode);
                        ut.setSessionAttribute.call(this, agencyIdAttr, agencyId);
                        break;
                    case constants.PROVIDERS.TRIMET:
                    default:
                        var longProp = constants.API.PROPERTIES.LONGIUDE;
                        var latProp = constants.API.PROPERTIES.LATITUDE;
                        var descProp = constants.API.PROPERTIES.TRIMET.DESCRIPTION;

                        var latitude = verifiedStopDetails[latProp];
                        var longitude = verifiedStopDetails[longProp];
                        var stopName = verifiedStopDetails[descProp];
                        var busIds = verifiedStopDetails[busIdAttr];
                        var routeIds = verifiedStopDetails[routeIdAttr];
                        var serviceCode = serviceproviderCode;
                        var agencyId = "0";
                        var serviceName = ut.getSessionAttribute.call(this, serviceNameAttr);

                        /** Persist verified STOP and Service Details */
                        ut.initAttribute.call(this, longitudeAttr, longitude);
                        ut.initAttribute.call(this, latitudeAttr, latitude);
                        ut.initAttribute.call(this, busIdAttr, busIds);
                        ut.initAttribute.call(this, routeIdAttr, routeIds);
                        ut.initAttribute.call(this, stopNameAttr, stopName);
                        ut.initAttribute.call(this, serviceCodeAttr, serviceproviderCode);
                        ut.initAttribute.call(this, serviceNameAttr, serviceName);
                        ut.setSessionAttribute.call(this, agencyIdAttr, agencyId);
                        break;
                }

                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_DETAILS_YES);
                this.emitWithState('GetGeocode');
                break;
            case constants.CONTEXT.VERIFY_STATION_DETAILS:
                var verifiedStationDetails = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FOUND_STOP_DETAILS);
                
                /** Propert Names */
                var latitudeProp = undefined;
                var longitudeProp = undefined;
                var stopOrStationNameProp = undefined;
                var stationOrStopIDorCodeProp = undefined;
                var zipcodeProp = undefined;
                var routesProp = undefined;
                var platformProp = undefined;

                /** Attribute Names */
                var serviceNameAttr = constants.ATTRIBUTES.SERVICE_NAME;
                var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
                var busIdAttr = constants.ATTRIBUTES.BUS_ID;
                var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
                var longitudeAttr = constants.ATTRIBUTES.LONGIUDE;
                var latitudeAttr = constants.ATTRIBUTES.LATITUDE;
                var homeStopNameAttr = constants.ATTRIBUTES.HOME_STOP_NAME;
                var zipcodeAttr = constants.ATTRIBUTES.ZIPCODE;
                var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
                var serviceName = ut.getProperties(verifiedStationDetails, serviceNameAttr);
                var serviceCode = ut.getProperties(verifiedStationDetails, serviceCodeAttr);

                switch (serviceName) {
                    case constants.PROVIDERS.BART:
                    default:
                        latitudeProp = constants.API.PROPERTIES.BART.LATITUDE;
                        longitudeProp = constants.API.PROPERTIES.BART.LONGIUDE;
                        stopOrStationNameProp = constants.API.PROPERTIES.BART.NAME;
                        zipcodeProp = constants.API.PROPERTIES.BART.ZIPCODE;
                        stationOrStopIDorCodeProp = constants.API.PROPERTIES.BART.ABBR;
                        routesProp = constants.API.PROPERTIES.BART.ROUTES;
                        
                        /** Extract data from found station details */
                        var latitude = ut.getProperties(verifiedStationDetails, latitudeProp);
                        var longitude = ut.getProperties(verifiedStationDetails, longitudeProp);
                        var stopOrStationName = ut.getProperties(verifiedStationDetails, stopOrStationNameProp);
                        var stationOrStopIDorCode = ut.getProperties(verifiedStationDetails, stationOrStopIDorCodeProp);
                        var zipcode = ut.getProperties(verifiedStationDetails, zipcodeProp);
                        var routes = ut.getProperties(verifiedStationDetails, routesProp);
                        var platform  = ut.getProperties(verifiedStationDetails, busIdAttr);

                        /** Create Persistance Setup Attributes */
                        ut.initAttribute.call(this, longitudeAttr, longitude);
                        ut.initAttribute.call(this, latitudeAttr, latitude);
                        ut.initAttribute.call(this, homeStopNameAttr, ut.replaceSpecialCharacters(stopOrStationName));
                        ut.initAttribute.call(this, busIdAttr, platform);
                        ut.initAttribute.call(this, routeIdAttr, routes);
                        ut.initAttribute.call(this, zipcodeAttr, zipcode);
                        ut.initAttribute.call(this, stopIdAttr, stationOrStopIDorCode);
                        ut.initAttribute.call(this, serviceNameAttr, serviceName);

                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STATION_DETAILS_YES);
                        this.emitWithState('GetTimeZone');
                        break;
                }
                break;
            default:
                var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
                var speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                this.emit('EndSession', speechOutput);
                break;
        }
    },

    'AMAZON.NoIntent': function() {
        var speechOutput = "";
        var promptSpeech = "";
        var badExclamation = "";
        var attemptsAttr = constants.ATTRIBUTES.SETUP_ATTEMPTS;
        var limtAttr = constants.ATTRIBUTES.SETUP_LIMIT;
        var currentContext = this.attributes[constants.ATTRIBUTES.CONTEXT];

        /** Determine context of session and respond accordingly */
        switch (currentContext) {
            case constants.CONTEXT.VERIFY_ZIPCODE:
            case constants.CONTEXT.INVALID_ZIPCODE_RESPONSE:
            case constants.CONTEXT.VERIFY_LOCATION:
            case constants.CONTEXT.VERIFY_STOP_ID_SETUP:
            case constants.CONTEXT.VERIFY_COUNTRY:
            case constants.CONTEXT.VERIFY_STOP_DETAILS:
            case constants.CONTEXT.VERIFY_STATION_DETAILS:
            case constants.CONTEXT.NO_STOPS_FOUND:
                /** Get Limits Left: TotalLimits - attempts made */
                var hasLimit = ut.hasAttribute.call(this, limtAttr);
                var hasSetupattempts = ut.hasAttribute.call(this, attemptsAttr);
                
                var limit = hasLimit ? parseInt(this.attributes[limtAttr]) : ut.initAttribute.call(this, limtAttr, cfg.APP.SETUP_LIMIT);
                var attempts = hasSetupattempts ? parseInt(this.attributes[attemptsAttr]) : ut.initAttribute.call(this, attemptsAttr, 0);
                var allowed = limit - attempts;

                if (attempts > allowed)
                {
                    this.emit('EndSession', this.t('SETUP_VERIFY_LIMIT'));
                }
                else
                {
                    /** Increase zipcode Setup Attemps by 1. end session when >= limit */
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ATTEMPTS, attempts + 1);
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.TRIES_LEFT, allowed - 1);

                    /** Set Session Context */
                    this.attributes[constants.ATTRIBUTES.CONTEXT] = currentContext;
                    this.emit('launchSetupMode');
                }
                break;
            case constants.CONTEXT.VERIFY_STOP:
            case constants.CONTEXT.MOVE_NEXT:
            case constants.CONTEXT.MOVE_PREVIOUS:
            case constants.CONTEXT.LAST_STOP_INDEX:
            case constants.CONTEXT.FIRST_STOP_INDEX:
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP_NO);
                this.emitWithState('AMAZON.NextIntent');
                break;
            case constants.CONTEXT.VERIFY_AGENCY:
            case constants.CONTEXT.NEXT_ITEM:
            case constants.CONTEXT.PREVIOUS_ITEM:
            case constants.CONTEXT.FIRST_ITEM_INDEX:
            case constants.CONTEXT.LAST_ITEM_INDEX:
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY_NO);
                this.emitWithState('AMAZON.NextIntent');
                break;
            default:
                badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
                speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                promptSpeech = this.t('STOP_NOT_FOUND_MESSAGE');
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    'AMAZON.HelpIntent': function() {
        /** Create SSML for spelling out zipcode rather than pronouncing it as a number */
        var speechZip = ut.spellDigitOutput(this.attributes[constants.ATTRIBUTES.ZIPCODE]);
        
        /** Get Random Exclamation word */
        var helpExclamation = ut.pickRandomWord(this.t('HELP_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var exclamation = ut.pickRandomWord(this.t('HELP_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var speechPause = constants.BREAKTIME['100'];
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var longPause = constants.BREAKTIME['150'];
        var pause = constants.BREAKTIME['100'];
        var fakeStopId = ut.getRandomNumber(1,100);
        var fakeCity = ut.getRandomUSCity();
        var fakeState = ut.getRandomUSState();
        var fakeZipCodeSpeech = ut.spellDigitOutput(ut.getRandomZipCode());
        var fakeSetupObject = `${fakeCity}${pause}${fakeState}${pause}${fakeStopId}`;

        var speechOutput = "";
        var promptSpeech = "";
        
        switch (this.attributes[constants.ATTRIBUTES.CONTEXT]) {
            case constants.CONTEXT.VERIFY_ZIPCODE:
            case constants.CONTEXT.VERIFY_ZIPCODE_NO:
            case constants.CONTEXT.VERIFY_STOP_YES:
            case constants.CONTEXT.VERIFY_STOP:
            case constants.CONTEXT.INVALID_ZIPCODE_RESPONSE:
            case constants.CONTEXT.VERIFY_LOCATION:
                /** Get Device Setup specific message and prompt from resource file */
                speechOutput = this.t('CONTEXT_VERIFY_ZIPCODE_HELP_MESSAGE', exclamation, speechZip);
                promptSpeech = this.t('CONTEXT_VERIFY_ZIPCODE_HELP_PROMPT', speechZip);

                /** Set Session Context and Persisit Response for repeat intent*/
                this.attributes[constants.ATTRIBUTES.CONTEXT] = constants.CONTEXT.VERIFY_ZIPCODE;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.DEVICE_SETUP:
            case constants.CONTEXT.NO_COUNTRY_FOUND:
            case constants.CONTEXT.VERIFY_STOP_ID_SETUP:
            case constants.CONTEXT.INVALID_STOP_ID_RESPONSE:
            case constants.CONTEXT.ZIPCODE_TIMZONE_FOUND:
            case constants.CONTEXT.VERIFY_STOP_DETAILS:
            case constants.CONTEXT.VERIFY_STATION_DETAILS:
            case constants.CONTEXT.VERIFY_COUNTRY:
                var intro = this.t('SETUP_HELP_INTRO', helpExclamation, fakeSetupObject, fakeSetupObject);
                var msg = this.t('SETUP_HELP_MESSAGE', fakeZipCodeSpeech, fakeZipCodeSpeech);
                var reset_msg = this.t('RESET_HELP_MESSAGE');
                var Utterances = this.t('UTTERANCE_OPTIONS_MESSAGE');

                promptSpeech = helpPrompt;
                speechOutput = `${intro} ${longPause} ${msg} ${longPause} ${reset_msg} ${longPause} ${Utterances}`;

                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.DEVICE_SETUP);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.MOVE_NEXT:
            case constants.CONTEXT.MOVE_PREVIOUS:
            case constants.CONTEXT.LAST_STOP_INDEX:
            case constants.CONTEXT.FIRST_STOP_INDEX:
                var msg = this.t('NAVIGATION_HELP_MESSAGE');
                var details = this.t('NAVIGATION_HELP_DETAILS');
                var desc = this.t('NAVIGATION_HELP_PROPMT');

                speechOutput = `${msg}${pause}${details}${pause}${desc}`;
                promptSpeech = helpPrompt;

                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            default:
                /** Default Help for  Setup Handler */
                var intro = this.t('SETUP_HELP_INTRO', helpExclamation, fakeSetupObject, fakeSetupObject);
                var message =  this.t('SETUP_HELP_MESSAGE', fakeZipCodeSpeech);
                var reset_msg = this.t('RESET_HELP_MESSAGE');
                var options = this.t('UTTERANCE_OPTIONS_MESSAGE');

                speechOutput = `${intro} ${pause} ${message} ${pause} ${reset_msg} ${pause} ${options}`;
                promptSpeech = helpPrompt;

                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    "AMAZON.StopIntent": function () {
        /** Determine Session Context and respond accordingly */
        this.emit('EndSession', 'Goodbye!');
    },

    "AMAZON.CancelIntent": function () {
        this.emit('EndSession', 'Goodbye!');
    },

    "AMAZON.RepeatIntent" : function(){
        var speechOutput = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SPEECH_OUTPUT);
        var promptSpeech = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.PROPMT_OUTPUT);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    "AMAZON.NextIntent" : function(){
        /** Get instance of Intent */
        myIntent = this;
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var pause = constants.BREAKTIME['150'];
        var midPause = constants.BREAKTIME['200'];
        var speechOutput = "";
        var promptSpeech = "";

        switch (this.attributes[constants.ATTRIBUTES.CONTEXT]) {
            case constants.CONTEXT.VERIFY_AGENCY:
            case constants.CONTEXT.VERIFY_AGENCY_NO:
            case constants.CONTEXT.NEXT_ITEM:
            case constants.CONTEXT.PREVIOUS_ITEM:
            case constants.CONTEXT.LAST_ITEM_INDEX:
            case constants.CONTEXT.FIRST_ITEM_INDEX:
                var currentItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM_INDEX);
                var firstItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FIRST_ITEM_INDEX);
                var lastItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_ITEM_INDEX);
                var avaialableItems = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.ITEMS_COLLECTION);
                var provider_code = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);

                var nextItem = undefined;
                var confirmSpeech = undefined;
                var itemName = undefined;
                var ItemType = undefined;

                var currentRecord = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD));
                var totalRecords = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TOTAL_RECORDS));
                var currentPage = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_PAGE));

                var nextItemIndex = parseInt(currentItemIndex) + 1
                var nextRecord = currentRecord + 1;

                /** Ensure the index does not go out of range */
                var isLastRecord = parseInt(nextRecord) > parseInt(totalRecords);
                var isLastPageRecord = parseInt(nextItemIndex) > parseInt(lastItemIndex);

                /** Ensure that recored is not greater than total items returned */
                if(!isLastRecord)
                {
                    /** Ensure That record is not greater than page size index [PAGE_SIZE - 1] */
                    if(!isLastPageRecord)
                    {
                        /** Set New Navigation Positions */
                        nextItem = avaialableItems[nextItemIndex];
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, nextItemIndex);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD, nextRecord);
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM, nextItem);

                        switch (provider_code) {
                            case constants.PROVIDERS.OBA:
                            default:
                                itemName = ut.replaceSpecialCharacters(nextItem[constants.API.PROPERTIES.OBA.NAME]);
                                ItemType = "Transit Service Provider";
                                confirmSpeech = this.t('USE_AS_DEFAULT_AGENCY_MESSAGE', itemName);

                                speechOutput = `${itemName}. ${pause} ${confirmSpeech}` 
                                promptSpeech = this.t('USE_AS_DEFAULT_AGENCY_PROMPT');

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                        }
                    }
                    else
                    {
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                        this.emitWithState('Navigate', constants.ENUM.NAVIGATION.NEXT);
                    }
                }
                else
                {   
                    var lastItem = avaialableItems[lastItemIndex];
                    itemName = ut.replaceSpecialCharacters(lastItem[constants.API.PROPERTIES.OBA.NAME]);
                    ItemType = "Transit Service Provider";
                    speechOutput = this.t('LAST_ITEM_INDEX_MESSAGE', itemName, ItemType);
                    promptSpeech = this.t('USE_AS_DEFAULT_AGENCY_MESSAGE', itemName);
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                    this.emit(':ask', speechOutput, promptSpeech);
                }
                break;
            case constants.CONTEXT.VERIFY_STOP:
            case constants.CONTEXT.MOVE_NEXT:
            case constants.CONTEXT.MOVE_PREVIOUS:
            case constants.CONTEXT.VERIFY_STOP_NO:
            case constants.CONTEXT.LAST_STOP_INDEX:
            case constants.CONTEXT.FIRST_STOP_INDEX:
                var currentStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP_INDEX);
                var firstStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FIRST_STOP_INDEX);
                var lastStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_INDEX);
                var avaialableStops = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.AVAILABLE_STOPS);
                
                var currentRecord = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD));
                var totalRecords = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TOTAL_RECORDS));
                var currentPage = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_PAGE));

                var nextStopIndex = parseInt(currentStopIndex) + 1;
                var nextRecord = currentRecord + 1;

                /** Ensure the index does not go out of range */
                var isLastRecord = parseInt(nextRecord) > parseInt(totalRecords);
                var isLastPageRecord = parseInt(nextStopIndex) > parseInt(lastStopIndex);

                if(!isLastRecord){
                    /** Ensure That record is not greater than page size index [PAGE_SIZE - 1] */
                    if(!isLastPageRecord)
                    {
                        var nextStop = avaialableStops[nextStopIndex];
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP_INDEX, nextStopIndex);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD, nextRecord);
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP, nextStop);
                        var serviceProviderCode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);

                        switch (serviceProviderCode) {
                            case constants.PROVIDERS.TRIMET:
                                var speechProcess = fmt.formatTrimetStopLocation(nextStop);
                                var stopSpeech = speechProcess.speech;
                                var stopName = speechProcess.stopName;
                                stopOrStationSpeech = "stop";

                                ut.initAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);

                                /** PERSIST THIS FOR EACH SELECTION */
                                var stopId = speechProcess.stopId;
                                var routesId = speechProcess.routes;
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${stopSpeech} ${pause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            case constants.PROVIDERS.BART:
                                /** BART Paramters & properties */
                                var originParam = constants.API.PARAMETERS.BART.ORIGIN;
                                var resultSetProp = constants.API.PROPERTIES.BART.RESULT_SET;
                                var stationsProp = constants.API.PROPERTIES.BART.STATIONS;
                                var stationsDataSetProp = constants.API.PROPERTIES.BART.STATION;
                                var introProp = constants.API.PROPERTIES.BART.INTRO;
                                var abbrProp = constants.API.PROPERTIES.BART.ABBR;
                                var northRouteProp = constants.API.PROPERTIES.BART.NORTH_ROUTES;
                                var southRouteProp = constants.API.PROPERTIES.BART.SOUTH_ROUTES;
                                var northPlatformProp = constants.API.PROPERTIES.BART.NORTH_PLATFORMS;
                                var southPlatformProp = constants.API.PROPERTIES.BART.SOUTH_PLATFORMS;
                                var platformIntroProp = constants.API.PROPERTIES.BART.PLATFORM_INFO;

                                var foundStation = fmt.speakBARTStationLocation(nextStop);
                                var NameAndAddressspeech = foundStation.speech;
                                var stationName = foundStation.name;
                                var stationId = foundStation.stopId;

                                stopOrStationSpeech = "station"
                                ut.initAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stationName);

                                apiType = constants.API.TYPE.STATION_DETAILS;
                                var stationCode = ut.getProperties(nextStop, abbrProp);
                                var apiParams = {};
                                apiParams[originParam] = stationCode;

                                var dataset = undefined;
                                var hasData = false;

                                api.getBARTApiData(apiType, apiParams, function(data){
                                    convert(data, {explicitArray : false}, function(err, res){
                                        dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                                        hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                                        if(hasData)
                                        {
                                            var stationDetails = fmt.formatFoundStop(dataset, serviceProviderCode);
                                            var northRoutes = stationDetails[northRouteProp];
                                            var southRoutes = stationDetails[southRouteProp];
                                            var northPlatforms = stationDetails[northPlatformProp];
                                            var southPlatforms = stationDetails[southPlatformProp];
                                            var intro = stationDetails[introProp];
                                            var platformInfo = stationDetails[platformIntroProp];

                                            /** Add Station details to current station object in Session */
                                            nextStop[northRouteProp] = northRoutes;
                                            nextStop[southRouteProp] = southRoutes;
                                            nextStop[northPlatformProp] = northPlatforms;
                                            nextStop[southPlatformProp] = southPlatforms;
                                            nextStop[introProp] = intro;
                                            nextStop[platformIntroProp] = platformInfo;

                                            /** Update current Stop object in session */
                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, nextStop);

                                            /** Prepare Speech output */
                                            var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stationName, stopOrStationSpeech);
                                            
                                            /** Get formated details speech */
                                            var formatSpeech = fmt.speakStopAndStationDetails(stationDetails, serviceProviderCode);
                                            speechOutput = `${formatSpeech}. ${midPause} ${confirmStopSpeech}`;
                                            promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                            ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                            myIntent.emit(':ask', speechOutput, promptSpeech);
                                        }
                                        else
                                        {
                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                            speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                            myIntent.emit('EndSession', speechOutput);
                                        }
                                    });
                                });
                                break;
                            case constants.PROVIDERS.MTA:
                                stopOrStationSpeech = "Stop"
                                var stopName = nextStop.name;

                                var stopDetails = fmt.formatFoundStop(nextStop, serviceProviderCode);
                                var stopdetailsSpeech = fmt.speakStopAndStationDetails(stopDetails, serviceProviderCode, stopOrStationSpeech);
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${stopdetailsSpeech}. ${midPause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);

                                ut.keepForRepeat.call(this, speechOutput, speechOutput);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            case constants.PROVIDERS.OBA:
                                stopOrStationSpeech = "Stop"
                                var stopName = ut.replaceSpecialCharacters(nextStop[constants.API.PROPERTIES.OBA.NAME]);
                                var currentStopSpeech = fmt.speakOBAStopsAndRoutes(nextStop);
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${currentStopSpeech}. ${midPause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);

                                ut.keepForRepeat.call(this, speechOutput, speechOutput);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            default:
                                var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
                                var speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                this.emit('EndSession', speechOutput);
                                break;
                        }
                    }
                    else
                    {
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                        this.emitWithState('Navigate', constants.ENUM.NAVIGATION.NEXT);
                    }
                }
                else
                {
                    var stop_name = ut.replaceSpecialCharacters(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME));
                    speechOutput = this.t('LAST_STOP_INDEX_MESSAGE', stop_name);
                    promptSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stop_name, stopOrStationSpeech);
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                    this.emit(':ask', speechOutput, promptSpeech);
                }
                break;
            default:
                var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
                var speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                var promptSpeech = this.t('STOP_NOT_FOUND_MESSAGE');
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    "AMAZON.PreviousIntent" : function(){
        /** Get instance of Intent */
        myIntent = this;
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var pause = constants.BREAKTIME['150'];
        var midPause = constants.BREAKTIME['200'];
        var speechOutput = "";
        var promptSpeech = "";
        var stopOrStationSpeech = "";

        switch (this.attributes[constants.ATTRIBUTES.CONTEXT]) {
            case constants.CONTEXT.VERIFY_AGENCY:
            case constants.CONTEXT.VERIFY_AGENCY_NO:
            case constants.CONTEXT.NEXT_ITEM:
            case constants.CONTEXT.PREVIOUS_ITEM:
            case constants.CONTEXT.LAST_ITEM_INDEX:
            case constants.CONTEXT.FIRST_ITEM_INDEX:
                var currentItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM_INDEX);
                var firstItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FIRST_ITEM_INDEX);
                var lastItemIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_ITEM_INDEX);
                var avaialableItems = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.ITEMS_COLLECTION);
                var provider_code = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
                
                var previousItem = undefined;
                var confirmSpeech = undefined;
                var itemName = undefined;
                var ItemType = undefined;

                var currentRecord = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD));
                var totalRecords = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TOTAL_RECORDS));
                var currentPage = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_PAGE));

                var previousItemIndex = parseInt(currentItemIndex) - 1;
                var previousRecord = currentRecord - 1;

                /** Ensure the index does not go out of range */
                var isFirstRecord = parseInt(previousRecord) < 2;
                var isFirstPageRecord = parseInt(previousItemIndex) < parseInt(firstItemIndex);

                if(!isFirstRecord)
                {
                    if(!isFirstPageRecord)
                    {
                        previousItem = avaialableItems[previousItemIndex];
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, previousItemIndex);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD, previousRecord);
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_ITEM, previousItem);

                        switch (provider_code) {
                            case constants.PROVIDERS.OBA:
                            default:
                                itemName = ut.replaceSpecialCharacters(previousItem[constants.API.PROPERTIES.OBA.NAME]);
                                ItemType = "Transit Service Provider";
                                confirmSpeech = this.t('USE_AS_DEFAULT_AGENCY_MESSAGE', itemName);

                                speechOutput = `${itemName}. ${pause} ${confirmSpeech}` 
                                promptSpeech = this.t('USE_AS_DEFAULT_AGENCY_PROMPT');

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                        }
                    }
                    else
                    {
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                        this.emitWithState('Navigate', constants.ENUM.NAVIGATION.PREVIOUS);
                    }
                }
                else
                {   
                    var firstItem = avaialableItems[firstItemIndex];
                    itemName = ut.replaceSpecialCharacters(firstItem[constants.API.PROPERTIES.OBA.NAME]);
                    ItemType = "Transit Service Provider";
                    speechOutput = this.t('FIRST_ITEM_INDEX_MESSAGE', itemName, ItemType);
                    promptSpeech = this.t('USE_AS_DEFAULT_AGENCY_MESSAGE', itemName);
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                    this.emit(':ask', speechOutput, promptSpeech);
                }
                break;
            case constants.CONTEXT.VERIFY_STOP:
            case constants.CONTEXT.MOVE_NEXT:
            case constants.CONTEXT.MOVE_PREVIOUS:
            case constants.CONTEXT.VERIFY_STOP_NO:
            case constants.CONTEXT.LAST_STOP_INDEX:
            case constants.CONTEXT.FIRST_STOP_INDEX:
                var currentStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP_INDEX);
                var firstStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.FIRST_STOP_INDEX);
                var lastStopIndex = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_INDEX);
                var avaialableStops = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.AVAILABLE_STOPS);
                
                var currentRecord = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD));
                var totalRecords = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TOTAL_RECORDS));
                var currentPage = parseInt(ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_PAGE));

                var previousStop = undefined;

                var previousStopIndex = parseInt(currentStopIndex) - 1;
                var previousRecord = currentRecord -1;

                /** Ensure the index does not go out of range */
                var isFirstRecord = parseInt(previousRecord) < 2;
                var isFirstPageRecord = parseInt(previousStopIndex) < parseInt(firstStopIndex);

                if(!isFirstRecord)
                {
                    if(!isFirstPageRecord)
                    {
                        previousStop = avaialableStops[previousStopIndex];
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP_INDEX, previousStopIndex);
                        ut.initAttribute.call(this, constants.ATTRIBUTES.CURRENT_RECORD, previousRecord);
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_STOP, previousStop);
                        var serviceProviderCode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);

                        switch (serviceProviderCode) {
                            case constants.PROVIDERS.TRIMET:
                                var speechProcess = fmt.formatTrimetStopLocation(previousStop);
                                var stopSpeech = speechProcess.speech;
                                var stopName = speechProcess.stopName;
                                stopOrStationSpeech = "stop";
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);

                                /** PERSIST THIS FOR EACH SELECTION */
                                var stopId = speechProcess.stopId;
                                var routesId = speechProcess.routes;
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${stopSpeech} ${pause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            case constants.PROVIDERS.BART:
                                /** BART Paramters & properties */
                                var originParam = constants.API.PARAMETERS.BART.ORIGIN;
                                var resultSetProp = constants.API.PROPERTIES.BART.RESULT_SET;
                                var stationsProp = constants.API.PROPERTIES.BART.STATIONS;
                                var stationsDataSetProp = constants.API.PROPERTIES.BART.STATION;
                                var introProp = constants.API.PROPERTIES.BART.INTRO;
                                var abbrProp = constants.API.PROPERTIES.BART.ABBR;
                                var northRouteProp = constants.API.PROPERTIES.BART.NORTH_ROUTES;
                                var southRouteProp = constants.API.PROPERTIES.BART.SOUTH_ROUTES;
                                var northPlatformProp = constants.API.PROPERTIES.BART.NORTH_PLATFORMS;
                                var southPlatformProp = constants.API.PROPERTIES.BART.SOUTH_PLATFORMS;
                                var platformIntroProp = constants.API.PROPERTIES.BART.PLATFORM_INFO;

                                var foundStation = fmt.speakBARTStationLocation(previousStop);
                                var NameAndAddressspeech = foundStation.speech;
                                var stationName = foundStation.name;
                                var stationId = foundStation.stopId;

                                stopOrStationSpeech = "station"
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stationName);

                                apiType = constants.API.TYPE.STATION_DETAILS;
                                var stationCode = ut.getProperties(previousStop, abbrProp);
                                var apiParams = {};
                                apiParams[originParam] = stationCode;

                                var dataset = undefined;
                                var hasData = false;

                                api.getBARTApiData(apiType, apiParams, function(data){
                                    convert(data, {explicitArray : false}, function(err, res){
                                        dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                                        hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                                        if(hasData)
                                        {
                                            var stationDetails = fmt.formatFoundStop(dataset, serviceProviderCode);
                                            var northRoutes = stationDetails[northRouteProp];
                                            var southRoutes = stationDetails[southRouteProp];
                                            var northPlatforms = stationDetails[northPlatformProp];
                                            var southPlatforms = stationDetails[southPlatformProp];
                                            var intro = stationDetails[introProp];
                                            var platformInfo = stationDetails[platformIntroProp];

                                            /** Add Station details to current station object in Session */
                                            previousStop[northRouteProp] = northRoutes;
                                            previousStop[southRouteProp] = southRoutes;
                                            previousStop[northPlatformProp] = northPlatforms;
                                            previousStop[southPlatformProp] = southPlatforms;
                                            previousStop[introProp] = intro;
                                            previousStop[platformIntroProp] = platformInfo;

                                            /** Update current Stop object in session */
                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP, previousStop);

                                            /** Prepare Speech output */
                                            var confirmStopSpeech = myIntent.t('USE_AS_DEFAULT_STOP_MESSAGE', stationName, stopOrStationSpeech);
                                            
                                            var formatSpeech = fmt.speakStopAndStationDetails(stationDetails, serviceProviderCode);
                                            speechOutput = `${formatSpeech}. ${midPause} ${confirmStopSpeech}`;
                                            promptSpeech = myIntent.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                            ut.keepForRepeat.call(myIntent, speechOutput, speechOutput);
                                            myIntent.emit(':ask', speechOutput, promptSpeech);
                                        }
                                        else
                                        {
                                            speechOutput = myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                            myIntent.emit('EndSession', speechOutput);
                                        }
                                    });
                                });
                                break;
                            case constants.PROVIDERS.MTA:
                                stopOrStationSpeech = "Stop"
                                var stopName = ut.replaceSpecialCharacters(previousStop.name);
                                
                                var stopDetails = fmt.formatFoundStop(previousStop, serviceProviderCode);
                                var stopdetailsSpeech = fmt.speakStopAndStationDetails(stopDetails, serviceProviderCode, stopOrStationSpeech);
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${stopdetailsSpeech}. ${midPause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);

                                ut.keepForRepeat.call(this, speechOutput, speechOutput);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            case constants.PROVIDERS.OBA:
                                stopOrStationSpeech = "Stop"
                                var stopName = ut.replaceSpecialCharacters(previousStop[constants.API.PROPERTIES.OBA.NAME]);
                                var currentStopSpeech = fmt.speakOBAStopsAndRoutes(previousStop);
                                var confirmStopSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stopName, stopOrStationSpeech);

                                speechOutput = `${currentStopSpeech}. ${midPause} ${confirmStopSpeech}`;
                                promptSpeech = this.t('USE_AS_DEFAULT_STOP_PROMPT', stopOrStationSpeech);

                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME, stopName);
                                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);

                                ut.keepForRepeat.call(this, speechOutput, speechOutput);
                                this.emit(':ask', speechOutput, promptSpeech);
                                break;
                            default:
                                var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
                                var speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                                this.emit('EndSession', speechOutput);
                                break;
                        }
                    }
                    else
                    {
                        ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                        this.emitWithState('Navigate', constants.ENUM.NAVIGATION.PREVIOUS);
                    }
                }
                else
                {
                    var stop_name = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LAST_STOP_NAME);
                    speechOutput = this.t('FIRST_STOP_INDEX_MESSAGE', stop_name);
                    promptSpeech = this.t('USE_AS_DEFAULT_STOP_MESSAGE', stop_name, stopOrStationSpeech);
                    ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                    this.emit(':ask', speechOutput, promptSpeech);
                }
                break;
            default:
                var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
                var speechOutput = this.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation);
                var promptSpeech = this.t('STOP_NOT_FOUND_MESSAGE');
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    'Navigate' : function(direction){
        var currentContext = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var providerCode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SERVICE_CODE);
        var setupType = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_TYPE);
        var setupIdType = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.SETUP_ID_TYPE);
        var currentPage = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CURRENT_PAGE);
        var pageSzie = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.PAGE_SIZE);

        var userLatitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LATITUDE);
        var userLongitude = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.LONGIUDE);
        var userZipcode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.ZIPCODE);
        var userStopId = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STOP_ID);
        var userStationId = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STATION_ID);
        var agencyId = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.AGENCY_ID);
        var userTimezone = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TIMEZONE);
        var userCity = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CITY);
        var userCountry = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY);

        var apiType = undefined;
        var apiParams = {};
        var jsData = undefined;
        var dataset = undefined;
        var hasData = false;
        var pageNumber = undefined;
        var intentName = undefined;
        var subSet = undefined;
        var availableStops = undefined;
        var availableStations = undefined;
        var availableItems = undefined;
        var page = undefined;
        var pagedResultSet = undefined;
        var lastIndex = 0;
        var itemCount = pageSzie;

        var myIntent = this;

        /** Speech Objects */
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));

        /** Determine Navigation Direction */
        switch (direction) {
            case constants.ENUM.NAVIGATION.NEXT:
                pageNumber = currentPage + 1;
                intentName = "AMAZON.NextIntent";
                break;
            case constants.ENUM.NAVIGATION.PREVIOUS:
                pageNumber = currentPage - 1;
                intentName = "AMAZON.PreviousIntent";
                break;
            default:
                pageNumber = currentPage;
                intentName = "AMAZON.NextIntent";
                break;
        }

        switch (providerCode) {
            case constants.PROVIDERS.TRIMET:
                /** Prepare parameters for API Request*/
                apiType = constants.API.TYPE.STOPS;
                apiParams.lat = userLatitude;
                apiParams.lng = userLongitude;

                api.getTrimetApiData(apiType, apiParams, function(data){
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[constants.API.PROPERTIES.TRIMET.RESULT_SET] : null;

                    subSet = constants.API.PROPERTIES.LOCATION;
                    hasData = !__.isEmpty(dataset) && __.has(dataset, subSet) && (dataset[subSet]).length > 0;

                    if(hasData)
                    {
                        availableStops = dataset[constants.API.PROPERTIES.LOCATION];

                        /** Create Coordinate for distance Calculation */
                        var userCords = ut.createGeoCordinates(userLatitude, userLongitude);
                        var sortedStopList = fmt.addDistanceSortTrimet(availableStops, userCords);
                        page = ut.paginate(sortedStopList, pageSzie, pageNumber);
                        pagedResultSet = page[constants.APP.RECORDS_SET];
                        lastIndex = page[constants.APP.LAST_INDEX];
                        itemCount = page[constants.APP.ITEM_COUNT];

                        /** Store Sorted Stops in Temporary Collection for user navigation via Next and Previous Utterances */
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, pageNumber);

                        switch (direction) {
                            case constants.ENUM.NAVIGATION.NEXT:
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, -1);
                                break;
                            case constants.ENUM.NAVIGATION.PREVIOUS:
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, itemCount);
                                break;
                            default:
                                break;
                        }
                        
                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                        myIntent.emitWithState(intentName);
                    }
                    else
                    {
                        this.emit('EndSession', this.t('UNKNOWN_CONTEXT_MESSAGE',  badExclamation));
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                var stationList = cfg.API.BART.STATIONS;
                var resultSetProp = constants.API.PROPERTIES.BART.RESULT_SET;
                var stationsProp = constants.API.PROPERTIES.BART.STATIONS;
                var stationsDataSetProp = constants.API.PROPERTIES.BART.STATION;
                var cityProp = constants.API.PROPERTIES.BART.CITY;
                var zipProp = constants.API.PROPERTIES.BART.ZIPCODE;

                apiType = constants.API.TYPE.STOPS;
                apiParams.lat = userLatitude;
                apiParams.lng = userLongitude;

                api.getBARTApiData(apiType, apiParams, function(data){
                    convert(data, {explicitArray : false}, function(err, res){
                        dataset = res[resultSetProp][stationsProp][stationsDataSetProp];
                        hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                        if(hasData)
                        {
                            availableStations = dataset;

                            /** Prepare Filter  */
                            var filter = {};
                            filter[cityProp] = _.trim(userCity);
                            filter[zipProp] = _.trim(userZipcode);

                            var filteredStationList = ut.selectFromJsonResult(availableStations, filter);
                            page = ut.paginate(filteredStationList, pageSzie, pageNumber);
                            pagedResultSet = page[constants.APP.RECORDS_SET];
                            lastIndex = page[constants.APP.LAST_INDEX];
                            itemCount = page[constants.APP.ITEM_COUNT];

                            /** Store Sorted Stops in Temporary Collection for user navigation via Next and Previous Utterances */
                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                            ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, pageNumber);

                            switch (direction) {
                                case constants.ENUM.NAVIGATION.NEXT:
                                    ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, -1);
                                    break;
                                case constants.ENUM.NAVIGATION.PREVIOUS:
                                    ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, itemCount);
                                    break;
                                default:
                                    break;
                            }

                            ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                            myIntent.emitWithState(intentName);
                        }
                        else
                        {
                            myIntent.emit('EndSession', myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation));
                        }
                    });
                });
                break;
            case constants.PROVIDERS.MTA:
                var longProp = constants.API.PROPERTIES.OBA.LONGIUDE;
                var latProp = constants.API.PROPERTIES.OBA.LATITUDE;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var stopsProp = constants.API.PROPERTIES.OBA.STOPS;

                apiType = constants.API.TYPE.STOPS;
                apiParams[latProp] = userLatitude;
                apiParams[longProp] = userLongitude;

                api.getOBAApiData(apiType, providerCode, apiParams, function(data){
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = jsData[dataProp][stopsProp];
                    hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                    if(hasData) 
                    {
                        availableStops = dataset;

                        /** use geolocation to calculate distance closest to user */
                        var userCords = ut.createGeoCordinates(userLatitude, userLongitude);
                        var sortedStopList = fmt.addDistanceSortOBA(availableStops, userCords);

                        page = ut.paginate(sortedStopList, pageSzie, pageNumber);
                        pagedResultSet = page[constants.APP.RECORDS_SET];
                        lastIndex = page[constants.APP.LAST_INDEX];
                        itemCount = page[constants.APP.ITEM_COUNT];

                        /** Store Sorted Stops for user navigation via Next and Previous Utterances */
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, pageNumber);

                        switch (direction) {
                            case constants.ENUM.NAVIGATION.NEXT:
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, -1);
                                break;
                            case constants.ENUM.NAVIGATION.PREVIOUS:
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, itemCount);
                                break;
                            default:
                                break;
                        }

                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                        myIntent.emitWithState(intentName);
                    }
                    else
                    {   
                        myIntent.emit('EndSession', myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation));
                    }
                });
                break;
            case constants.PROVIDERS.OBA:
                var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
                var latParam = constants.API.PARAMETERS.OBA.LATITUDE;
                var lonParam = constants.API.PARAMETERS.OBA.LONGIUDE;
                var radParam = constants.API.PARAMETERS.OBA.RADIUS;
                var agencyIdPrama = constants.API.PARAMETERS.OBA.AGENCY_ID;
                
                switch (currentContext) {
                    case constants.CONTEXT.VERIFY_AGENCY:
                        apiType = constants.API.TYPE.SERVING_AGENCIES;
                        apiParams[stopIdParam] = userStopId;

                        /** Get list of all Agencies serving the region */
                        api.getOBAApiData(apiType, providerCode, apiParams, function(data){
                            jsData = ut.processJsonData(data);
                            hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                            if(hasData)
                            {
                                var foundAgencies = fmt.formatAgenciesCovered(jsData);
                                page = ut.paginate(foundAgencies, pageSzie, pageNumber);
                                pagedResultSet = page[constants.APP.RECORDS_SET];
                                lastIndex = page[constants.APP.LAST_INDEX];
                                itemCount = page[constants.APP.ITEM_COUNT];


                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.ITEMS_COLLECTION, pagedResultSet);
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_ITEM_INDEX, 0);
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_ITEM_INDEX, lastIndex);
                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, pageNumber);

                                
                                switch (direction) {
                                    case constants.ENUM.NAVIGATION.NEXT:
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, -1);
                                        break;
                                    case constants.ENUM.NAVIGATION.PREVIOUS:
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_ITEM_INDEX, itemCount);
                                        break;
                                    default:
                                        break;
                                }

                                ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_AGENCY);
                                myIntent.emitWithState(intentName);
                            }
                            else
                            {
                                myIntent.emit('EndSession', myIntent.t('UNKNOWN_CONTEXT_MESSAGE', badExclamation));
                            }
                        });
                        break;
                    case constants.CONTEXT.VERIFY_STOP:
                        apiType = constants.API.TYPE.STOPS;
                        apiParams[agencyIdPrama] = agencyId;
                        apiParams[lonParam] = userLongitude;
                        apiParams[latParam] = userLatitude;

                        /** Retrieve and Process user Stop */
                        api.getOBAApiData(apiType, providerCode, apiParams, function(data){
                            jsData = ut.processJsonData(data);
                            dataset = jsData[constants.API.PROPERTIES.OBA.DATA];
                            hasData = !__.isNull(dataset) && !__.isEmpty(dataset);

                            if(hasData)
                            {
                                var listDataSet = dataset[constants.API.PROPERTIES.OBA.LIST];
                                var hasStops = !__.isEmpty(listDataSet);

                                if(hasStops)
                                {
                                    var foundStops = fmt.formatOBAStopsForAgency(dataset, agencyId);
                                    if(!__.isNull(foundStops) && !__.isEmpty(foundStops))
                                    {
                                        page = ut.paginate(foundStops, pageSzie, pageNumber);
                                        pagedResultSet = page[constants.APP.RECORDS_SET];
                                        lastIndex = page[constants.APP.LAST_INDEX];
                                        itemCount = page[constants.APP.ITEM_COUNT];

                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.AVAILABLE_STOPS, pagedResultSet);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.FIRST_STOP_INDEX, 0);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.LAST_STOP_INDEX, lastIndex);
                                        ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_PAGE, pageNumber);


                                        switch (direction) {
                                            case constants.ENUM.NAVIGATION.NEXT:
                                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, -1);
                                                break;
                                            case constants.ENUM.NAVIGATION.PREVIOUS:
                                                ut.initAttribute.call(myIntent, constants.ATTRIBUTES.CURRENT_STOP_INDEX, itemCount);
                                                break;
                                            default:
                                                break;
                                        }

                                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.VERIFY_STOP);
                                        myIntent.emitWithState(intentName);
                                    }
                                    else
                                    {
                                        myIntent.emit('EndSession', myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation));
                                    }
                                }
                                else
                                {
                                    myIntent.emit('EndSession', myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation));
                                }
                            }
                            else
                            {
                                myIntent.emit('EndSession', myIntent.t('STOP_NOT_FOUND_INTRO', badExclamation));
                            }
                        });
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    },

    'AMAZON.StartOverIntent' : function(){
        ut.clearAttributes.call(this);
        this.emit('NewSession');
    },

    'SessionEndedRequest': function () {
        this.emit('EndSession', constants.APP.TERMINATE);
    },

    'Unhandled': function() {
        this.emit('UnhandledSession');
    },

    'ResetIntent' : function(){
        /** Delete all Attributes */
        Object.keys(this.attributes).forEach((attribute) => {
            delete this.attributes[attribute];
        });
        
        var exclamation = ut.pickRandomWord(this.t('HELP_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var speechOutput = this.t('RESET_MESSAGE', exclamation);
        this.emit('EndSession', speechOutput);
    }
});

module.exports = setupHandlers;