var Alexa = require('alexa-sdk');
var constants = require('./constants');
var __ = require('underscore');
var _ = require('lodash');
var ut = require('./utility');
var cfg = require('./config');
var api = require('./api');
var fmt = require('./formating');


var startHandlers = Alexa.CreateStateHandler(constants.STATES.STARTMODE, {
    /** Handles Briefing */
    'GetBriefing' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var requestedStopAttr = constants.ATTRIBUTES.REQUESTED_STOP_ID;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttribute);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);
        
        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));

        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var assitsSpeech = myIntent.t('DO_SOMETHING_ELSE');
        var responseSpeech = undefined;

        /** Context Specific user Variables */
        var userStopId = undefined;
        var userRouteId =  undefined;
        var userTimezone = undefined;
        var newContextName = undefined;
        var userAgencyId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var responseType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSetProp = undefined;
        var processedData = undefined;
        var briefingData = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                break;
        }

        /** Set Common Attribute */
        userRouteId = ut.getSessionAttribute.call(this, routeIdAttr);
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);
        
        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.ROUTE_ID;
                
                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId;
                
                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        responseType = constants.API.RESPONSE.BRIEFING;
                        responseSpeech = fmt.formatTrimetResponse(dataset, userTimezone, responseType, apiParams);
                        speechOutput = `${responseSpeech} ${pause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Summaries");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.BRIEFING;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        briefingData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(briefingData, userTimezone, responseType);

                        var msg = myIntent.t('REQUEST_UTTERANCES_MESSAGE');
                        var msg_1 = myIntent.t('REQUEST_UTTERANCES_HELP');

                        speechOutput = `${responseSpeech} ${pause} ${msg} ${pause} ${msg_1}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Summaries");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Arrivals */
    'GetArrival' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceProviderAttr = constants.ATTRIBUTES.SERVICE_NAME;
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
        var busIdAttr = constants.ATTRIBUTES.BUS_ID;
        var LongitudeAttr = constants.ATTRIBUTES.LONGIUDE;
        var LatitudeAttr = constants.ATTRIBUTES.LATITUDE;
        var homeStopNameAttr = constants.ATTRIBUTES.HOME_STOP_NAME;
        var countryAttr = constants.ATTRIBUTES.COUNTRY;
        var countryStateAttr = constants.ATTRIBUTES.COUNTRY_STATE;
        var cityAttr = constants.ATTRIBUTES.CITY;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var zipcodeAttr = constants.ATTRIBUTES.ZIPCODE;
        var contextAttr = constants.ATTRIBUTES.CONTEXT;
        var requestedStopAttr = constants.ATTRIBUTES.REQUESTED_STOP_ID;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttr);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['150'];
        var midPause = constants.BREAKTIME['250'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));

        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var assitsSpeech = this.t('DO_SOMETHING_ELSE');
        var schedulesSpeech = undefined;
        var arrivalsSpeech = undefined;
        var alertsSpeech = undefined;
        var delaysSpeech = undefined;
        var detoursSpeech = undefined;
        var arrivalPluralSpeech = undefined;
        var introSpeech = undefined;
        var navigationSpeech = undefined;

        /** Context Specific user Variables */
        var userStopId = undefined;
        var userRouteId =  undefined;
        var userBusId = undefined;
        var userLongitude = undefined;
        var userLatitude = undefined;
        var userHomeStopName = undefined;
        var userCountry = undefined;
        var userState = undefined;
        var userCity = undefined;
        var userTimezone = undefined;
        var userZipcode = undefined;
        var newContextName = undefined;
        var requestedStopId = undefined;
        var requestedBusId = undefined;
        var requestedRouteId = undefined;
        var userAgencyId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var responseType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSet = null;
        var resultSetProp = undefined;
        var processedData = undefined;
        var arrivalData = undefined;
        var responseSpeech = undefined;

        /** Navigation variables */
        var currentIndex = 0;
        var firstIndex = 0;
        var lastIndex = undefined;
        var arrivalCount = undefined;
        var currentArrival = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                userRouteId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                userRouteId = ut.getSessionAttribute.call(this, routeIdAttr);
                break;
        }

        /** Set Common Attribute */
        userLongitude = ut.getSessionAttribute.call(this, LongitudeAttr);
        userLatitude = ut.getSessionAttribute.call(this, LatitudeAttr);
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);

        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:   
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.ROUTE_ID;
                var latProp = constants.API.PARAMETERS.LATITUDE;
                var lngProp = constants.API.PARAMETERS.LONGIUDE; 
                
                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId;
                apiParams[lngProp] = userLongitude;
                apiParams[latProp] = userLatitude;

                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        responseType = constants.API.RESPONSE.ARRIVALS;
                        var responseSpeech = fmt.formatTrimetResponse(dataset, userTimezone, responseType, apiParams);

                        speechOutput = `${responseSpeech} ${pause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Arrivals");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
                case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;
                var nameProp = constants.API.PROPERTIES.OBA.NAME;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.ARRIVALS;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        arrivalData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);

                        arrivalCount = arrivalData.length;
                        currentArrival = arrivalData[currentIndex];
                        arrivalPluralSpeech = ut.getPlural("arrival", arrivalCount);
                        var stopName = currentArrival[nameProp];
                        var stopNameSpeech = ut.replaceSpecialCharacters(stopName);

                        introSpeech = `I found ${arrivalCount} ${arrivalPluralSpeech} for ${stopNameSpeech}`;
                        navigationSpeech = myIntent.t('NAVIGATE_ITEMS_MESSAGE', "arrival");
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(currentArrival, userTimezone, responseType);

                        speechOutput = `${introSpeech}. ${pause} ${responseSpeech} ${pause} ${navigationSpeech} ${longPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Arrivals");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Detours */
    'GetDetour' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var requestedRouteAttr = constants.ATTRIBUTES.REQUESTED_ROUTE_ID;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttribute);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var assitsSpeech = this.t('DO_SOMETHING_ELSE');
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        
        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var detourPluralSpeech = undefined;
        var navigationSpeech = undefined;
        var introSpeech = undefined;
        var responseSpeech = undefined;

        /** Context Specific user Variables */
        var userRouteId =  undefined;
        var userTimezone = undefined;
        var newContextName = undefined;
        var userAgencyId = undefined;
        var userStopId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSetProp = undefined;
        var processedData = undefined;
        var detoursData = undefined;
        var responseType = undefined;
        
        /** Navigation variables */
        var currentIndex = 0;
        var firstIndex = 0;
        var lastIndex = undefined;
        var detourCount = undefined;
        var currentDetour = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userRouteId = ut.getSessionAttribute.call(this, requestedRouteAttr);
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userRouteId = ut.getSessionAttribute.call(this, routeIdAttr);
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                break;
        }

        /** Set Common Attribute */
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);

        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:
                /** Request Parameters */
                var routeIdProp = constants.API.PARAMETERS.ROUTE_ID;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.DETOURES;
                apiParams[routeIdProp] = userRouteId.toString();

                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        /** Get Processed Summary/Briefing Speech from formating function */
                        var responseSpeech = fmt.formatTrimetDetourResponse(dataset, userTimezone, apiParams);
                        var assitsSpeech = myIntent.t('DO_SOMETHING_ELSE');
                        var speech = `${responseSpeech} ${pause} ${assitsSpeech}`;
                        speechOutput = speech;
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Detours");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;
                var nameProp = constants.API.PROPERTIES.OBA.NAME;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.DETOURES;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        detourData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);

                        detourCount = !__.isUndefined(detoursData) && !__.isEmpty(detoursData) ? detoursData.length : 0;
                        currentDetour = !__.isUndefined(detoursData) && !__.isEmpty(detoursData) ? detoursData[currentIndex] : "";
                        detourPluralSpeech = ut.getPlural("detour", detourCount);
                        var stopName = !__.isEmpty(currentDetour) && ut.hasKey(currentDetour, nameProp) ? currentDetour[nameProp] : "";
                        var stopNameSpeech = ut.replaceSpecialCharacters(stopName);
                        var forSpeech = !__.isEmpty(stopName) ? `for ${stopNameSpeech}`: "";

                        introSpeech = detourCount > 0 ? `I found ${detourCount} ${detourPluralSpeech} ${forSpeech}` : `There are no ${detourPluralSpeech} reported`;
                        navigationSpeech = myIntent.t('NAVIGATE_ITEMS_MESSAGE', "detour");
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(currentDetour, userTimezone, responseType);

                        speechOutput = `${introSpeech}. ${pause} ${responseSpeech} ${pause} ${navigationSpeech} ${longPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Detours");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Alerts */
    'GetAlert' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var requestedStopAttr = constants.ATTRIBUTES.REQUESTED_STOP_ID;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var routeIdAttr = constants.ATTRIBUTES.ROUTE_ID;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttribute);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        
        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var assitsSpeech = this.t('DO_SOMETHING_ELSE');
        var responseSpeech = undefined;
        var alertPluralSpeech = undefined;
        var navigationSpeech = undefined;
        var introSpeech = undefined;

        /** Context Specific user Variables */
        var userStopId = undefined;
        var userTimezone = undefined;
        var newContextName = undefined;
        var userRouteId =  undefined;
        var userAgencyId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var responseType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSetProp = undefined;
        var processedData = undefined;
        var alertData = undefined;
        var responseType = undefined;

        /** Navigation variables */
        var currentIndex = 0;
        var firstIndex = 0;
        var lastIndex = undefined;
        var alertCount = undefined;
        var currentAlert = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                break;
        }

        /** Set Common Attribute */
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userRouteId = ut.getSessionAttribute.call(this, routeIdAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);

        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.ROUTE_ID;
                
                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[routeIdProp] = userRouteId.toString();

                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        responseType = constants.API.RESPONSE.ALERTS;
                        responseSpeech = fmt.formatTrimetResponse(dataset, userTimezone, responseType, apiParams);
                        speechOutput = `${responseSpeech} ${pause} ${assitsSpeech}`;;
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Alerts");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;
                var nameProp = constants.API.PROPERTIES.OBA.NAME;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.ALERTS;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        alertData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);

                        alertCount = alertData.length;
                        currentAlert = alertData[currentIndex];
                        alertPluralSpeech = ut.getPlural("alert", alertCount);
                        var stopName = !__.isEmpty(currentAlert) && ut.hasKey(currentAlert, nameProp) ? currentAlert[nameProp] : "";
                        var stopNameSpeech = ut.replaceSpecialCharacters(stopName);
                        var forSpeech = !__.isEmpty(stopName) ? `for ${stopNameSpeech}`: "";

                        introSpeech = alertCount > 0  ? `I found ${alertCount} ${alertPluralSpeech} ${forSpeech}` : `There are no ${alertPluralSpeech} at the moment`;
                        navigationSpeech = myIntent.t('NAVIGATE_ITEMS_MESSAGE', "alert");
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(currentAlert, userTimezone, responseType);

                        speechOutput = `${introSpeech}. ${pause} ${responseSpeech} ${pause} ${navigationSpeech} ${longPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Alerts");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Delays */
    'GetDelay' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var requestedStopAttr = constants.ATTRIBUTES.REQUESTED_STOP_ID;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttribute);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));

        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var assitsSpeech = myIntent.t('DO_SOMETHING_ELSE');
        var delayPluralSpeech = undefined;
        var navigationSpeech = undefined;
        var introSpeech = undefined;
        var responseSpeech = undefined;

        /** Context Specific user Variables */
        var userStopId = undefined;
        var userTimezone = undefined;
        var newContextName = undefined;
        var userAgencyId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var responseType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSetProp = undefined;
        var processedData = undefined;
        var delayData = undefined;

        /** Navigation variables */
        var currentIndex = 0;
        var firstIndex = 0;
        var lastIndex = undefined;
        var delayCount = undefined;
        var currentDelay = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                break;
        }

        /** Set Common Attribute */
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);

        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.STOP_ID;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;

                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        responseType = constants.API.RESPONSE.DELAYS;
                        responseSpeech = fmt.formatTrimetResponse(dataset, userTimezone, responseType, apiParams);
                        speechOutput = `${responseSpeech} ${midPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Delays");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;
                var nameProp = constants.API.PROPERTIES.OBA.NAME;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.DELAYS;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        delayData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);

                        delayCount = delayData.length;
                        currentArrival = delayData[currentIndex];
                        delayPluralSpeech = ut.getPlural("delay", delayCount);
                        var stopName = currentArrival[nameProp];
                        var stopNameSpeech = ut.replaceSpecialCharacters(stopName);

                        introSpeech = `I found ${delayCount} ${delayPluralSpeech} for ${stopNameSpeech}`;
                        navigationSpeech = myIntent.t('NAVIGATE_ITEMS_MESSAGE', "delay");
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(currentArrival, userTimezone, responseType);

                        speechOutput = `${introSpeech}. ${pause} ${responseSpeech} ${pause} ${navigationSpeech} ${longPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Delays");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Schedules */
    'GetSchedule' : function(requestType){
        /** Create Instance */
        var myIntent = this;

        /** Session Attribute Names */
        var serviceCodeAttr = constants.ATTRIBUTES.SERVICE_CODE;
        var stopIdAttr = constants.ATTRIBUTES.STOP_ID;
        var timezoneAttr = constants.ATTRIBUTES.TIMEZONE;
        var requestedStopAttr = constants.ATTRIBUTES.REQUESTED_STOP_ID;
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var agencyIdAttr = constants.ATTRIBUTES.AGENCY_ID;

        var currentContext = ut.getSessionAttribute.call(this, contextAttribute);
        var userServiceProvider = ut.getSessionAttribute.call(this, serviceCodeAttr);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['200'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));

        /** Speech Ouputs */
        var speechOutput = this.t('SERVICE_PROVIDER_NOT_SUPPORTED', badExclamation);
        var promptSpeech = this.t('ASK_OR_EXIT');
        var assitsSpeech = myIntent.t('DO_SOMETHING_ELSE');
        var schedulePluralSpeech = undefined;
        var navigationSpeech = undefined;
        var introSpeech = undefined;
        var responseSpeech = undefined;

        /** Context Specific user Variables */
        var userStopId = undefined;
        var userTimezone = undefined;
        var newContextName = undefined;
        var userAgencyId = undefined;

        /** API Request properties and containers */
        var apiParams = {};
        var apiType = undefined;
        var responseType = undefined;
        var jsData = null;
        var dataset = null;
        var hasData = false;
        var resultSetProp = undefined;
        var processedData = undefined;
        var scheduleData = undefined;

        /** Navigation variables */
        var currentIndex = 0;
        var firstIndex = 0;
        var lastIndex = undefined;
        var scheduleCount = undefined;
        var currentSchedule = undefined;

        /** Determine if request is for Home Stop or passed Stop */
        switch (requestType) {
            case constants.ENUM.REQUEST_TYPE.OTHER:
                userStopId = ut.getSessionAttribute.call(this, requestedStopAttr);
                break;
            case constants.ENUM.REQUEST_TYPE.HOME:
            default:
                userStopId = ut.getSessionAttribute.call(this, stopIdAttr);
                break;
        }

        /** Set Common Attribute */
        userTimezone = ut.getSessionAttribute.call(this, timezoneAttr);
        userAgencyId = ut.getSessionAttribute.call(this, agencyIdAttr);

        /** Determine Transit Agency and Call appropriate API */
        switch (userServiceProvider) {
            case constants.PROVIDERS.TRIMET:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.STOP_ID;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;

                /** Get reference to resultSet properties in API response data */
                resultSetProp = constants.API.PROPERTIES.TRIMET.RESULT_SET;

                /** Initiate API call */
                api.getTrimetApiData(apiType, apiParams, function(data){
                    /** Get and Parse Api results */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    dataset = !__.isEmpty(jsData) ? jsData[resultSetProp] : null;
                    hasData = !__.isEmpty(dataset);

                    if(hasData)
                    {
                        responseType = constants.API.RESPONSE.SCHEDULES;
                        responseSpeech = fmt.formatTrimetResponse(dataset, userTimezone, responseType, apiParams);
                        speechOutput = `${responseSpeech} ${midPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Schedules");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            case constants.PROVIDERS.BART:
                break;
            case constants.PROVIDERS.MTA:
                break;
            case constants.PROVIDERS.OBA:
                /** Request Parameters */
                var stopIdProp = constants.API.PARAMETERS.OBA.STOP_ID;
                var routeIdProp = constants.API.PARAMETERS.OBA.ROUTE_ID;
                var dataProp = constants.API.PROPERTIES.OBA.DATA;
                var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
                var arrDeps = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
                var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;
                var nameProp = constants.API.PROPERTIES.OBA.NAME;

                /** Set API request Parameters */
                apiType = constants.API.TYPE.ARRIVALS;
                apiParams[stopIdProp] = userStopId;
                apiParams[agencyIdParam] = userAgencyId;

                api.getOBAApiData(apiType, userServiceProvider, apiParams, function(data){
                    var jsData = ut.processJsonData(data);
                    var dataset = jsData[dataProp];
                    var entry = dataset[entryProp];
                    var ArrDeps = entry[arrDeps];

                    var hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
                    var hasEntry = !__.isNull(entry) && !__.isEmpty(entry);
                    var hasArrvDeps = !__.isNull(ArrDeps) && !__.isEmpty(ArrDeps);

                    if(hasData && hasEntry && hasArrvDeps)
                    {
                        responseType = constants.API.RESPONSE.SCHEDULES;
                        processedData = fmt.processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams);
                        scheduleData = fmt.formatOBAArrivalsAndDepartures(processedData, userTimezone, responseType);

                        scheduleCount = scheduleData.length;
                        currentSchedule = scheduleData[currentIndex];
                        schedulePluralSpeech = ut.getPlural("schedule", scheduleCount);
                        var stopName = !__.isUndefined(currentSchedule) && !__.isEmpty(currentSchedule) ? currentSchedule[nameProp] : "";
                        var stopNameSpeech = ut.replaceSpecialCharacters(stopName);
                        var forSpeech = !__.isEmpty(stopName) ? `fro ${stopNameSpeech}` : "";

                        introSpeech = scheduleCount > 0 ? `I found ${scheduleCount} ${schedulePluralSpeech} ${forSpeech}` : `There are no reported ${schedulePluralSpeech}`;
                        navigationSpeech = myIntent.t('NAVIGATE_ITEMS_MESSAGE', "schedule");
                        responseSpeech = fmt.speakOBAArrivalsAndDepartures(currentSchedule, userTimezone, responseType);

                        speechOutput = `${introSpeech}. ${pause} ${responseSpeech} ${pause} ${navigationSpeech} ${longPause} ${assitsSpeech}`;
                        promptSpeech = helpPrompt;

                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, "Transit Schedules");
                        promptSpeech = helpPrompt;
                        newContextName = constants.CONTEXT.ASK_OR_EXIT;
                        ut.setSessionAttribute.call(myIntent, contextAttribute, newContextName);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
                break;
            default:
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    /** Handles Home Summary Requests */
    'HomeBriefingIntent' : function(){
        /** Set Session Context */
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.GET_HOME_BRIEFING;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetBriefing', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** Handles Home Arrival requests */
    'HomeArrivalsIntent' : function(){
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.HOME_ARRIVALS;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetArrival', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** Handles Home ALert requests */
    'HomeAlertsIntent' : function(){
        /** Set Session Context */
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.HOME_ALERTS;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetAlert', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** handles Home Schedule Request */
    'HomeSchedulesIntent' : function(){
        /** Set Session Context */
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.HOME_SCHEDULES;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetSchedule', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** Handles Home Delay Requests */
    'HomeDelaysIntent' : function(){
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.HOME_DELAYS;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetDelay', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** Handles Home Detour Requests */
    'HomeDetouresIntent' : function(){
        var contextAttribute = constants.ATTRIBUTES.CONTEXT;
        var contextName = constants.CONTEXT.HOME_DETOURES;
        ut.setSessionAttribute.call(this, contextAttribute, contextName);
        this.emitWithState('GetDetour', constants.ENUM.REQUEST_TYPE.HOME);
    },

    /** Handles Other Stop Briefing */
    'StopBriefingIntent' : function(){
        /** Get Spoken ID */
        var stopid = parseInt(this.event.request.intent.slots.stopid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_STOP_BRIEFING;
        var stopidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(stopid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_STOP_ID, stopid);
            stopidSpeech = ut.spellDigitOutput(stopid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, stopidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /** Handles Other Stop Arrivals */
    'StopArrivalsIntent' : function(){
        /** Get Spoken ID */
        var stopid = parseInt(this.event.request.intent.slots.stopid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_STOP_ARRIVALS;
        var stopidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(stopid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_STOP_ID, stopid);
            stopidSpeech = ut.spellDigitOutput(stopid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, stopidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /** Handles Other Stop Schedules */
    'StopSchedulesIntent' : function(){
        /** Get Spoken ID */
        var stopid = parseInt(this.event.request.intent.slots.stopid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_STOP_SCHEDULES;
        var stopidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(stopid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_STOP_ID, stopid);
            stopidSpeech = ut.spellDigitOutput(stopid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, stopidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /*** Handles Other Stop Alerts */
    'StopAlertsIntent' : function(){
        /** Get Spoken ID */
        var stopid = parseInt(this.event.request.intent.slots.stopid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_STOP_ALERTS;
        var stopidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(stopid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_STOP_ID, stopid);
            stopidSpeech = ut.spellDigitOutput(stopid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, stopidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /** Handles Other Stop Delays */
    'StopDelaysIntent' : function(){
        /** Get Spoken ID */
        var stopid = parseInt(this.event.request.intent.slots.stopid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_STOP_DELAYS;
        var stopidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(stopid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_STOP_ID, stopid);
            stopidSpeech = ut.spellDigitOutput(stopid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, stopidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /** Handles Other Route Detours  */
    'RouteDetouresIntent' : function(){
        var routeid = parseInt(this.event.request.intent.slots.routeid.value);
        var defaultSorryExclamation = this.t(constants.DEFAULTS.SORRY_EXCLAMATION);
        var defaultGoodExclamation = this.t(constants.DEFAULTS.OK_EXCLAMATION);
        var shortPause = constants.BREAKTIME['150'];
        var longPause = constants.BREAKTIME['350'];
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), defaultSorryExclamation);
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), defaultGoodExclamation);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = constants.CONTEXT.GET_ROUTE_DETOURS;
        var routeidSpeech = undefined;
        var speechOutput = "";
        var promptSpeech = helpPrompt;

        if(ut.isValidNumber(routeid))
        {
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.REQUESTED_ROUTE_ID, routeid);
            routeidSpeech = ut.spellDigitOutput(routeid);
            speechOutput = this.t('VERIFY_REQUESTED_ID_MESSAGE', goodExclamation, routeidSpeech);
        }
        else
        {
            speechOutput = this.t('INVALID_REQUESTED_ID_MESSAGE', badExclamation);
        }

        ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
        ut.keepForRepeat.call(this, speechOutput, promptSpeech);
        this.emit(':ask', speechOutput, promptSpeech);
    },

    'AMAZON.YesIntent' : function(){
        var currentContext = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var sessionContextAttr = constants.ATTRIBUTES.CONTEXT;
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var newContextName = undefined;

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];

        /** Speech Ouputs */
        var speechOutput = "Unknown Response for Yes Intent";
        var promptSpeech = helpPrompt;

        switch (currentContext) {
            case constants.CONTEXT.DIRECT_INTENT_REQUEST:
            case constants.CONTEXT.WELCOME:
            case constants.CONTEXT.GET_MORE_SUMMARY:
            case constants.CONTEXT.GET_HOME_BRIEFING:
                newContextName = constants.CONTEXT.GET_HOME_BRIEFING_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetBriefing', constants.ENUM.REQUEST_TYPE.HOME);
                break;
            case constants.CONTEXT.GET_ANOTHER_ARRIVAL:
            case constants.CONTEXT.HOME_ARRIVALS:
            case constants.CONTEXT.GET_ARRIVALS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_ANOTHER_ARRIVAL_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_ALERTS:
            case constants.CONTEXT.HOME_ALERTS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_ALERTS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_SCHEDULES:
            case constants.CONTEXT.HOME_SCHEDULES:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_SCHEDULES_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_DELAYS:
            case constants.CONTEXT.HOME_DELAYS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_DELAYS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_DETOURES:
            case constants.CONTEXT.GET_DETOURES:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_DETOURES_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_BRIEFING:
                newContextName = constants.CONTEXT.GET_STOP_BRIEFING_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetBriefing', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.GET_STOP_ARRIVALS:
                newContextName = constants.CONTEXT.GET_STOP_ARRIVALS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetArrival', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.GET_STOP_SCHEDULES:
                newContextName = constants.CONTEXT.GET_STOP_SCHEDULES_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetSchedule', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.GET_STOP_ALERTS:
                newContextName = constants.CONTEXT.GET_STOP_ALERTS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetAlert', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.GET_STOP_DELAYS:
                newContextName = constants.CONTEXT.GET_STOP_DELAYS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetDelay', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.GET_ROUTE_DETOURS:
                newContextName = constants.CONTEXT.GET_ROUTE_DETOURS_YES;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                this.emitWithState('GetDetour', constants.ENUM.REQUEST_TYPE.OTHER);
                break;
            case constants.CONTEXT.REQUEST_MORE:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.REQUEST_MORE;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.ASK_OR_EXIT:
            default:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.ASK_OR_EXIT;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    'AMAZON.NoIntent': function() {
        var currentContext = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var newContextName = undefined;
        
        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];

        /** Speech Ouputs */
        var speechOutput = helpPrompt;
        var promptSpeech = this.t('AVAILABLE_OPTIONS');
        
        switch (currentContext) {
            case constants.CONTEXT.WELCOME:
            case constants.CONTEXT.GET_MORE_SUMMARY:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_MORE_SUMMARY_NO;
                ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_ANOTHER_ARRIVAL:
            case constants.CONTEXT.HOME_ARRIVALS:
            case constants.CONTEXT.GET_ARRIVALS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_ANOTHER_ARRIVAL_NO;
                ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_ALERTS:
            case constants.CONTEXT.HOME_ALERTS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_ALERTS_NO;
                ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_SCHEDULES:
            case constants.CONTEXT.HOME_SCHEDULES:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_SCHEDULES_NO;
                ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_DELAYS:
            case constants.CONTEXT.HOME_DELAYS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_DELAYS_NO;
                ut.setSessionAttribute.call(this, contextAttributeName, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_DETOURES:
            case constants.CONTEXT.GET_DETOURES:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_DETOURES_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_BRIEFING:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_STOP_BRIEFING_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_ARRIVALS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_STOP_ARRIVALS_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_SCHEDULES:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_STOP_SCHEDULES_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_ALERTS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_STOP_ALERTS_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_STOP_DELAYS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_STOP_DELAYS_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_ROUTE_DETOURS:
                speechOutput = this.t('ASK_OR_EXIT');
                promptSpeech = helpPrompt;
                newContextName = constants.CONTEXT.GET_ROUTE_DETOURS_NO;
                ut.setSessionAttribute.call(this, sessionContextAttr, newContextName);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.REQUEST_MORE:
            default:
                this.emit('EndSession', 'Ok!, GoodBye');
                break;
        }
    },

    'AMAZON.HelpIntent': function() {
        /** Declare Help Variables */
        var currentContext = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT);
        var contextAttributeName = constants.ATTRIBUTES.CONTEXT;
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT));
        var helpExclamation = ut.pickRandomWord(this.t('HELP_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var stopName = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME);
        var fakeStopId = ut.getRandomNumber(30,100);

        /** Speech Pauses */
        var sentence = constants.BREAKTIME['SENTENCE'];
        var paragraph = constants.BREAKTIME['PARAGRAPH'];

        /** Speech Ouputs */
        var speechOutput = "";
        var promptSpeech = "";

        switch (currentContext) {
            case constants.CONTEXT.HOME_ALERTS:
            case constants.CONTEXT.GET_ALERTS:
            case constants.CONTEXT.GET_STOP_ALERTS:
            case constants.CONTEXT.GET_ALERTS_YES:
            case constants.CONTEXT.GET_STOP_ALERTS_YES:
            case constants.CONTEXT.GET_ALERTS_NO:
            case constants.CONTEXT.GET_STOP_ALERTS_NO:
                var msg_1 = this.t('GET_ALERTS_HELP_MESSAGE_1', stopName, fakeStopId);
                var msg_2 = this.t('GET_ALERTS_HELP_MESSAGE_2');
                speechOutput = `${msg_1} ${sentence} ${msg_2}`;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_SCHEDULES:
            case constants.CONTEXT.GET_SCHEDULES:
            case constants.CONTEXT.GET_SCHEDULES_YES:
            case constants.CONTEXT.GET_SCHEDULES_NO:
            case constants.CONTEXT.GET_STOP_SCHEDULES:
            case constants.CONTEXT.GET_STOP_SCHEDULES_YES:
            case constants.CONTEXT.GET_STOP_SCHEDULES_NO:
                var msg_1 = this.t('GET_SCHEDULES_HELP_MESSAGE_1', stopName);
                var msg_2 = this.t('GET_SCHEDULES_HELP_MESSAGE_2', fakeStopId, fakeStopId);
                speechOutput = `${msg_1} ${sentence} ${msg_2}`;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_ARRIVALS:
            case constants.CONTEXT.GET_ANOTHER_ARRIVAL:
            case constants.CONTEXT.GET_ANOTHER_ARRIVAL_YES:
            case constants.CONTEXT.GET_ANOTHER_ARRIVAL_NO:
            case constants.CONTEXT.GET_ARRIVALS:
            case constants.CONTEXT.GET_ARRIVALS_YES:
            case constants.CONTEXT.GET_ARRIVALS_NO:
            case constants.CONTEXT.GET_STOP_ARRIVALS:
            case constants.CONTEXT.GET_STOP_ARRIVALS_YES:
            case constants.CONTEXT.GET_STOP_ARRIVALS_NO:
                speechOutput = this.t('HOME_ARRIVAL_HELP_MESSAGE', stopName);
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.GET_MORE_SUMMARY:
            case constants.CONTEXT.GET_MORE_SUMMARY_YES:
            case constants.CONTEXT.GET_MORE_SUMMARY_NO:
            case constants.CONTEXT.GET_STOP_BRIEFING:
            case constants.CONTEXT.GET_STOP_BRIEFING_YES:
            case constants.CONTEXT.GET_STOP_BRIEFING_NO:
                var msg_1 = this.t('GET_SUMMARY_HELP_MESSAGE_1', stopName);
                var msg_2 = this.t('GET_SUMMARY_HELP_MESSAGE_2', fakeStopId);
                speechOutput = `${msg_1} ${sentence} ${msg_2}`;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_DELAYS:
            case constants.CONTEXT.GET_DELAYS:
            case constants.CONTEXT.GET_STOP_DELAYS:
            case constants.CONTEXT.GET_DELAYS_YES:
            case constants.CONTEXT.GET_STOP_DELAYS_YES:
            case constants.CONTEXT.GET_DELAYS_NO:
            case constants.CONTEXT.GET_STOP_DELAYS_NO:
                var msg_1 = this.t('GET_DELAYS_HELP_MESSAGE_1', stopName);
                var msg_2 = this.t('GET_DELAYS_HELP_MESSAGE_2', fakeStopId);
                speechOutput = `${msg_1} ${sentence} ${msg_2}`;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.HOME_DETOURES:
            case constants.CONTEXT.GET_ROUTE_DETOURS:
            case constants.CONTEXT.GET_ROUTE_DETOURS_YES:
            case constants.CONTEXT.GET_ROUTE_DETOURS_NO:
                var msg_1 = this.t('GET_DETOURES_HELP_MESSAGE_1', stopName);
                var msg_2 = this.t('GET_DETOURES_HELP_MESSAGE_2', fakeStopId);
                speechOutput = `${msg_1} ${sentence} ${msg_2}`;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.DIRECT_INTENT_REQUEST:
            case constants.CONTEXT.WELCOME:
            default:
                var msg_1 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_1', helpExclamation);
                var msg_2 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_2');
                var msg_3 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_3');
                var msg_4 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_4');
                var msg_5 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_5', fakeStopId, fakeStopId);
                var msg_6 = this.t('STARTMODE_GENERAL_HELP_MESSAGE_6');

                var helpSentence = `${msg_1}${paragraph}
                ${msg_2}${paragraph}
                ${msg_3}${paragraph}
                ${msg_4}${paragraph}
                ${msg_5}${paragraph}
                ${msg_6}`;

                speechOutput = helpSentence;
                promptSpeech = helpPrompt;
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    },

    "AMAZON.NextIntent" : function(){
        this.emit('EndSession', 'Next Intent Not Enabled!');
    },

    "AMAZON.PreviousIntent" : function(){
        this.emit('EndSession', 'Previous Intent Not Enabled!');
    },

    "AMAZON.StopIntent": function () {
        this.emit('EndSession', 'Goodbye!');
    },

    "AMAZON.CancelIntent": function () {
        this.emit('EndSession', 'Goodbye!');
    },

    "AMAZON.StartOverIntent" : function(){
        ut.clearAttributes.call(this);
        this.emit('NewSession');
    },

    "AMAZON.RepeatIntent" : function(){
        var speechAttribute = constants.ATTRIBUTES.SPEECH_OUTPUT;
        var promptAttribute = constants.ATTRIBUTES.PROPMT_OUTPUT;
        var speechOutput = ut.getSessionAttribute.call(this, speechAttribute);
        var promptSpeech = ut.getSessionAttribute.call(this, promptAttribute);
        this.emit(':ask', speechOutput, promptSpeech);
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

module.exports = startHandlers;