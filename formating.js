/**Import Utility.js files to gain access to helper functions defined in it */
var ut = require('./utility');
var constants = require('./constants');
var __ = require('underscore');
var _ = require('lodash');
var api = require('./api');
var cfg = require('./config');

/** Processes and Extracts Address Data from Google Geocode API Results 
 * @param {object} dataset - JSON Dataset returned from API call
 * @param {string} unknown_text - default text to set for null or undefined Properties
*/
function formatLocationData(dataset, unknown_text){
    /** Final object to return */
    var outPutDataSet = {};

    var resultSet = dataset[0];
    var addressComponent = resultSet[constants.API.PROPERTIES.GEOCODE.ADDRESS_COMPONENT];

    /** Extract Various Section from API results */
    var locationSet = resultSet[constants.API.PROPERTIES.GEOCODE.GEOMETRY][constants.API.PROPERTIES.LOCATION] || null;
    var countrySet = ut.queryGeoCodeJson(addressComponent, constants.API.PROPERTIES.GEOCODE.COUNTRY) || null;
    var stateSet = ut.queryGeoCodeJson(addressComponent, constants.API.PROPERTIES.GEOCODE.STATE) || null;
    var citySet = ut.queryGeoCodeJson(addressComponent, constants.API.PROPERTIES.GEOCODE.CITY) || null;
    var subCitySet = ut.queryGeoCodeJson(addressComponent, constants.API.PROPERTIES.GEOCODE.SUB_CITY) || null;
    var postalCodeSet = ut.queryGeoCodeJson(addressComponent, constants.API.PROPERTIES.GEOCODE.POSTAL_CODE) || null;

    var hasCityOrSubCity = !__.isNull(citySet) || !__.isNull(subCitySet);

    /** Create Properties for user location */
    var longName = constants.API.PROPERTIES.GEOCODE.LONG_NAME;
    outPutDataSet.country = ut.hasKey(countrySet, longName) ? countrySet[longName] : unknown_text;
    outPutDataSet.state = ut.hasKey(stateSet, longName) ? stateSet[longName] : unknown_text;
    outPutDataSet.location = locationSet;

    if(hasCityOrSubCity)
    {
        var city = ut.hasKey(citySet, longName) ? citySet[longName] : null;
        var subcity = ut.hasKey(subCitySet, longName) ? subCitySet[longName] : null;
        outPutDataSet.city = city || subcity || unknown_text;
    }
    else
    {
        outPutDataSet.city = null;
    }

    /** Return Geocode Data */
    return outPutDataSet;
}

/** Processes and Extracts Zipcode Data from Google Geocode API Results 
 * @param {object} dataset - JSON Dataset returned from API call
 * @param {string} unknown_text - default text to set for null or undefined Properties
*/
function formatZipCodeData(dataset, unknown_text){
    /** Final object to return */
    var ds = {};
    var resultSet = dataset[0];
    var addressComponent = resultSet[constants.API.PROPERTIES.GEOCODE.ADDRESS_COMPONENT];
    var postalCodeProp = constants.API.PROPERTIES.GEOCODE.POSTAL_CODE;
    var longNameProp = constants.API.PROPERTIES.GEOCODE.LONG_NAME;

    /** Extract Postal Code */
    var postalCodeSet = ut.queryGeoCodeJson(addressComponent, postalCodeProp || null);
    ds.zipecode = ut.hasKey(postalCodeSet, longNameProp) ? postalCodeSet[longNameProp] : unknown_text;

    return ds;
}

/** Processes and Extracts Time Zone Data from Google Geocode API Results 
 * @param {object} dataset - JSON Dataset returned from API call
 * @param {string} unknown_text - default text to set for null or undefined Properties
*/
function formatTimezoneData(dataset, unknown_text){
    var property = constants.API.PROPERTIES.TIMEZONE.TIMEZONE_ID;
    return dataset[property] || unknown_text;
}

/** Adds distance property to API results, by calculating
 * the geodistance between the uses lat/lng and Stop lat/lng. then
 * sorts stops in ascending order (closest stops first)
 * @param {object} dataset - API results
 * @param {object} userCordinates - user cordinates {lat:xx, lng:xx}
 */
function addDistanceSortTrimet(dataset, userCordinates){
    if(__.isUndefined(dataset) || __.isNull(dataset) || __.isEmpty(dataset)) return null;
    var distanceAdded = __.each(dataset, function(value, key, list){
        var context = list[key];
        var stopCords = ut.createGeoCordinates(context.lat, context.lng);
        context.distance = _.round(ut.calculateGeoDistance(userCordinates, stopCords),2);
    });

    return _.sortBy(distanceAdded, ['distance']);
}

/** Adds distance property to API results, by calculating
 * the geodistance between the uses lat/lng and Stop lat/lng. then
 * sorts stops in ascending order (closest stops first)
 * @param {object} dataset - API results
 * @param {object} userCordinates - user cordinates {lat:xx, lng:xx}
 */
function addDistanceSortOBA(dataset, userCordinates){
    if(__.isUndefined(dataset) || __.isNull(dataset) || __.isEmpty(dataset)) return null;
    var distanceAdded = __.each(dataset, function(value, key, list){
        var context = list[key];
        var stopCords = ut.createGeoCordinates(context.lat, context.lon);
        context.distance = _.round(ut.calculateGeoDistance(userCordinates, stopCords),2);
    });

    return _.sortBy(distanceAdded, ['distance']);
}

function formatTrimetStopLocation(dataset){
    var ds = {};
    ds.stopId = dataset[constants.API.PROPERTIES.TRIMET.LOCATION_ID];
    ds.desc = dataset[constants.API.PROPERTIES.TRIMET.DESCRIPTION];
    ds.direction = dataset[constants.API.PROPERTIES.TRIMET.DIRECTION];
    ds.routes = formatTrimetStopRoute(dataset[constants.API.PROPERTIES.TRIMET.ROUTE]);

    var descSpeech = ut.replaceSpecialCharacters(ds.desc);
    var speltStopId = ut.spellDigitOutput(ds.stopId);
    var routeSpeech = ut.getTransitArraySentence(ds.routes.speech);

    var output = {};
    output.speech = `Stop ID ${speltStopId}. ${descSpeech}, ${ds.direction}, serviced by, ${routeSpeech}.`;
    output.stopName = descSpeech;
    output.stopId = ds.stopId;
    output.routes = ds.routes.routes;
    output.buses = ds.routes.buses;

    return output;
}

function speakBARTStationLocation(dataset){
    var name = dataset[constants.API.PROPERTIES.BART.NAME];
    var address = dataset[constants.API.PROPERTIES.BART.ADDRESS];
    var stopId = dataset[constants.API.PROPERTIES.BART.ABBR];
    var nameSpeech = ut.replaceSpecialCharacters(name);

    var ds = {};
    ds.speech = `${nameSpeech} on ${address}`;
    ds.name = nameSpeech;
    ds.address = nameSpeech;
    ds.stopId = stopId;
    
    return ds;
}

function formatTrimetStopRoute(dataset){
    var output = {};
    var routeSpeech = [];
    var routes = [];
    var buses = [];
    var ds = {};
    var speech = "";
    var descSpeech = "";
    var pause = constants.BREAKTIME['100'];
    var routeDirDescSpeech = "";

    var typeProperty = constants.API.PROPERTIES.TRIMET.TYPE;
    var routeProperty = constants.API.PROPERTIES.TRIMET.ROUTE;
    var descProperty = constants.API.PROPERTIES.TRIMET.DESCRIPTION;
    var dirProperty = constants.API.PROPERTIES.TRIMET.DIRECTION;

    __.each(dataset, function(value, key, list){
        var context = list[key];
        ds.type = constants.ENUM.TRIMET.ROUTE_TYPE[context[typeProperty]];
        ds.route = context[routeProperty];
        ds.description = context[descProperty];
        ds.dir_desc = context[dirProperty][0][descProperty];

        descSpeech = ut.replaceSpecialCharacters(ds.description);
        routeDirDescSpeech = ut.replaceSpecialCharacters(ds.dir_desc);

        speech = `${ds.type} ${descSpeech} ${routeDirDescSpeech}, ${pause}`;   
        routeSpeech.push(speech);

        /** Add unique routes */
        if(!__.contains(routes, ds.route)){
            routes.push(ds.route );
        }

        /** Add unique routes */
        if(!__.contains(buses, ds.route)){
            buses.push(ds.route );
        }
        
        ds = {};
        descSpeech = "";
        speech = "";
    });

    output.speech = routeSpeech;
    output.routes = routes;
    output.buses = buses;
    
    return output;
}

/** Format Random fact */
function formatRandomFacts(dataset){
    var ds = {};
    ds[constants.API.PROPERTIES.FACTS.NUMBER] = dataset[constants.API.PROPERTIES.FACTS.NUMBER];
    ds[constants.API.PROPERTIES.FACTS.TEXT] = ut.replaceSpecialCharacters(dataset[constants.API.PROPERTIES.FACTS.TEXT]);
    return ds;
}

function formatWeather(dataset){
    var ds = {};
    ds[constants.API.PROPERTIES.WEATHER.WEATHER] = dataset[constants.API.PROPERTIES.WEATHER.WEATHER];
    ds[constants.API.PROPERTIES.WEATHER.HUMIDITY] = dataset[constants.API.PROPERTIES.WEATHER.HUMIDITY];
    ds[constants.API.PROPERTIES.WEATHER.WIND_MPH] = dataset[constants.API.PROPERTIES.WEATHER.WIND_MPH];
    ds[constants.API.PROPERTIES.WEATHER.FAHRENHEIT_TEMP] = dataset[constants.API.PROPERTIES.WEATHER.FAHRENHEIT_TEMP];
    return ds;
}

/** Formats and returns User Country */
function formatPlace(dataset){
    var desc = undefined;
    var country = "";

    desc = _.split(dataset[constants.API.PROPERTIES.PLACES.DESCRIPTION], ',');
    country = _.takeRight(desc);
    return !__.isEmpty(country) ? _.trim(country[0]) : null;
}

function formatFoundTrimetRoutesAndBuses(dataset){
    /** Array to stored unique stops and routes */
    var routes = [];
    var buses = [];
    var ds = {};
    var routeProp = constants.API.PROPERTIES.TRIMET.ROUTE;
    var route = undefined;

    __.each(dataset, function(value, key, list){
        var context = list[key];
        route = context[routeProp];
        
        /** Added to routes array */
        if(!__.contains(routes, route)){
            routes.push(route);
        }

        /** Added to buses array */
        if(!__.contains(buses, route)){
            buses.push(route);
        }
    });

    ds.routes = routes;
    ds.buses = buses;
    return ds;
}

/** Prepares Stop Details Speech */
function speakStopAndStationDetails(dataset, providerCode, stopOrStation){
    var stopSpeech = undefined;
    var speechOutput = undefined;
    var stopName = undefined;
    var direction = undefined;
    var routeAgencyName = undefined;
    var stopId = undefined;
    var stopIdSpellSpeech = undefined;
    var routesList = undefined;
    var routes = [];
    var northRoutes = [];
    var southRoutes = [];
    var northPlatforms = [];
    var southPlatforms = [];
    var pause = constants.BREAKTIME['200'];
    var midPause = constants.BREAKTIME['300'];
    var longPause = constants.BREAKTIME['350'];
    var routesSpeech = undefined;
    var platformSpeech = undefined;
    var stopAddress = undefined;
    
    switch (providerCode) {
        case constants.PROVIDERS.BART:
            var northRouteProp = constants.API.PROPERTIES.BART.NORTH_ROUTES;
            var southRouteProp = constants.API.PROPERTIES.BART.SOUTH_ROUTES;
            var northPlatformProp = constants.API.PROPERTIES.BART.NORTH_PLATFORMS;
            var southPlatformProp = constants.API.PROPERTIES.BART.SOUTH_PLATFORMS;
            var introProp = constants.API.PROPERTIES.BART.INTRO;
            var platformIntroProp = constants.API.PROPERTIES.BART.PLATFORM_INFO;
            var nameProp = constants.API.PROPERTIES.BART.NAME;
            var addressProp = constants.API.PROPERTIES.BART.ADDRESS;

            stopAddress =  dataset[addressProp];
            stopName = ut.replaceSpecialCharacters(dataset[nameProp]);

            cleanArray(dataset[northRouteProp], northRoutes)
            cleanArray(dataset[southRouteProp], southRoutes)
            cleanArray(dataset[northPlatformProp], northPlatforms)
            cleanArray(dataset[southPlatformProp], southPlatforms)

            var northRoutesSpeech = ut.getTransitArraySentence(northRoutes);
            var southRoutesSpeech = ut.getTransitArraySentence(southRoutes);
            var northPlatformsSpeech = ut.getTransitArraySentence(northPlatforms);
            var southPlatformsSpeech = ut.getTransitArraySentence(southPlatforms);
            var nameAndAddressSpeech = `${stopName} on ${stopAddress}`;

            var speech = `${nameAndAddressSpeech}`;
            var speech_1 = `Northbound on, ${northRoutesSpeech}, ${pause} Southbound on, ${southRoutesSpeech}. ${midPause}`;
            var speech_2 = `Boarding on north platforms, ${northPlatformsSpeech}, and south platforms, ${southPlatformsSpeech}.`;
            speechOutput = `${speech} ${midPause} ${speech_1} ${midPause} ${speech_2} `;
            return speechOutput;
        case constants.PROVIDERS.MTA:
        case constants.PROVIDERS.OBA:
        default:
            /** Get all Formated MTA OBA Routes */
            routesList = dataset.routes;
            /** Prepare Route speech and add to routes array for processing */
            __.each(routesList, function(value, key, list){
                var rt = list[key];
                var agencyName = getAgencyName(rt.agencyName);
                var routeDescription = ut.replaceSpecialCharacters(rt.routeDescription);
                var speech = `Route ${rt.routeShortName}, ${midPause} ${rt.routeLongName} ${midPause} ${routeDescription}. ${midPause}`;
                routes.push(speech);
            });

            /** Convert routes array to sentence */
            stopIdSpellSpeech = ut.spellDigitOutput(dataset.stopId);
            routesSpeech = ut.getTransitArraySentence(routes);
            direction = dataset.direction;
            speechOutput = `${stopOrStation} ID ${stopIdSpellSpeech}, ${getOBADirections(direction)}, serving, ${pause} ${routesSpeech}`
            return speechOutput;
    }
}

function cleanArray(dataset, resultset){
    __.each(dataset, function(value, key, list){
        var item = list[key];

        if(!__.contains(resultset, item)){
            resultset.push(_.trim(item));
        }
    });
}

function getAgencyName(searchtext){
    return searchtext.replace(/MTA/g, 'Metropolitan Transit Authority,')
}

function getOBADirections(directionCode){
    switch (directionCode) {
        case "W":
            return "Westbound";
        case "E":
            return "Eastbound";
        case "N":
            return "Northbound";
        case "S":
            return "Southbound";
        default:
            return "";
    }
}

/** Process Stops and Stations API results based on service provider */
function formatFoundStop(dataset, providerCode){
    var ds = {};
    var longProp = undefined;
    var latProp = undefined;
    var descProp = undefined;
    var nameProp = undefined;
    var introProp = undefined;
    var zipcodProp = undefined;
    var stopIdProp = undefined;
    var cityProp = undefined;
    var routeProp = undefined;
    var routesProp = undefined;
    var platformProp = undefined;
    var platformInfoProp = undefined;
    var dataProp = undefined;
    var codeProp = undefined;
    var directionProp = undefined;
    var agencyProp = undefined;
    var timezoneProp = undefined;
    var longNameProp = undefined;
    var shortNameProp = undefined;
    var idProp = undefined;
    var addressProp = undefined;

    switch (providerCode) {
        case constants.PROVIDERS.TRIMET:
            longProp = constants.API.PROPERTIES.LONGIUDE;
            latProp = constants.API.PROPERTIES.LATITUDE;
            descProp = constants.API.PROPERTIES.TRIMET.DESCRIPTION;

            /** Set Return object */
            ut.setDirectProperties(dataset, ds, latProp);
            ut.setDirectProperties(dataset, ds, longProp);
            ut.setProperties(ds, descProp, ut.replaceSpecialCharacters(dataset[descProp]));
            break;
        case constants.PROVIDERS.MTA:
            dataProp = constants.API.PROPERTIES.OBA.DATA;
            longProp = constants.API.PROPERTIES.OBA.LONGIUDE;
            latProp = constants.API.PROPERTIES.OBA.LATITUDE;
            descProp = constants.API.PROPERTIES.OBA.DESCRIPTION;
            nameProp = constants.API.PROPERTIES.OBA.NAME;
            codeProp = constants.API.PROPERTIES.OBA.CODE;
            directionProp = constants.API.PROPERTIES.OBA.DIRECTION;
            agencyProp = constants.API.PROPERTIES.OBA.AGENCY;
            timezoneProp = constants.API.PROPERTIES.OBA.TIMEZONE;
            longNameProp = constants.API.PROPERTIES.OBA.LONG_NAME;
            shortNameProp = constants.API.PROPERTIES.OBA.SHORT_NAME;
            idProp = constants.API.PROPERTIES.OBA.ID;
            routesProp = constants.API.PROPERTIES.OBA.ROUTES;
            
            var resultSet = dataset[dataProp] || dataset;
            var routesSet = resultSet[routesProp];
            var timezones = [];
            var routeIds = [];

            ds.busIds = [];
            ds.routes = [];
            ds.stopId = resultSet[codeProp];
            ds.direction = resultSet[directionProp];
            ds.latitude = resultSet[latProp];
            ds.longitude = resultSet[longProp];
            ds.stopName = ut.replaceSpecialCharacters(resultSet[nameProp]);

            /** Cycle through routes */
            __.each(routesSet, function(value, key, list){
                 var rs = {};
                 var route = list[key];
                 var agency = route[agencyProp];

                 var tmz = agency[timezoneProp];
                 var routeId = route[idProp];

                 rs.agencyName = agency[nameProp];
                 rs.agencyId = agency[idProp];
                 rs.routeDescription = route[descProp];
                 rs.routeLongName = route[longNameProp];
                 rs.routeShortName = route[shortNameProp];

                 if(!__.contains(timezones, tmz)){
                     timezones.push(tmz);
                 }

                 if(!__.contains(routeIds, routeId)){
                     routeIds.push(routeId);
                 }

                 ds.routes.push(rs);
            });

            ds.timezone = timezones[0];
            ds.routeId = routeIds;
            break;
        case constants.PROVIDERS.BART:
            longProp = constants.API.PROPERTIES.BART.LONGIUDE;
            latProp = constants.API.PROPERTIES.BART.LATITUDE;
            nameProp = constants.API.PROPERTIES.BART.NAME;
            zipcodProp = constants.API.PROPERTIES.BART.ZIPCODE;
            stopIdProp = constants.API.PROPERTIES.BART.ABBR;
            cityProp = constants.API.PROPERTIES.BART.CITY;
            introProp = constants.API.PROPERTIES.BART.INTRO;
            routesProp = constants.API.PROPERTIES.BART.ROUTES;
            routeProp = constants.API.PROPERTIES.BART.ROUTE;
            platformProp = constants.API.PROPERTIES.BART.PLATFORM;
            platformInfoProp = constants.API.PROPERTIES.BART.PLATFORM_INFO;
            addressProp = constants.API.PROPERTIES.BART.ADDRESS;
        
            var north_routes_prop = constants.API.PROPERTIES.BART.NORTH_ROUTES;
            var south_routes_prop = constants.API.PROPERTIES.BART.SOUTH_ROUTES;
            var north_platform_prop = constants.API.PROPERTIES.BART.NORTH_PLATFORMS;
            var south_Platform_prop = constants.API.PROPERTIES.BART.SOUTH_PLATFORMS;

            var routes = [];
            var platforms = [];

            var northRouteSet = dataset[north_routes_prop][routeProp];
            var southRouteSet = dataset[south_routes_prop][routeProp];
            var northPlatformSet = dataset[north_platform_prop][platformProp];
            var southPlatformSet = dataset[south_Platform_prop][platformProp];

            ut.combind(northRouteSet, routes);
            ut.combind(southRouteSet, routes);
            ut.combind(northPlatformSet, platforms);
            ut.combind(southPlatformSet, platforms);

            /** Set Return object */
            ut.setDirectProperties(dataset, ds, longProp);
            ut.setDirectProperties(dataset, ds, latProp);
            ut.setDirectProperties(dataset, ds, nameProp);
            ut.setDirectProperties(dataset, ds, zipcodProp);
            ut.setDirectProperties(dataset, ds, stopIdProp);
            ut.setDirectProperties(dataset, ds, cityProp);
            ut.setDirectProperties(dataset, ds, introProp);
            ut.setDirectProperties(dataset, ds, platformInfoProp);
            ut.setDirectProperties(dataset, ds, addressProp);
            
            ut.setProperties(ds, north_routes_prop, northRouteSet);
            ut.setProperties(ds, south_routes_prop, southRouteSet);
            ut.setProperties(ds, north_platform_prop, northPlatformSet);
            ut.setProperties(ds, south_Platform_prop, southPlatformSet);

            ut.setProperties(ds, 'routes', routes);
            ut.setProperties(ds, 'platforms', platforms);
            break;
        default:
            ds = null;
            break;
    }

    /** Return results */
    return ds;
}

function formatTrimetDetourResponse(dataset, userTimezone, apiParams){
    /** Speech Pauses */
    var sentence = constants.BREAKTIME['SENTENCE'];
    var paragraph = constants.BREAKTIME['PARAGRAPH'];
    var pause = constants.BREAKTIME['100'];
    var midPause = constants.BREAKTIME['200'];
    var longPause = constants.BREAKTIME['350'];

    /** Detour properties */
    var routeProp = constants.API.PROPERTIES.TRIMET.ROUTE;
    var detourProp = constants.API.PROPERTIES.TRIMET.DETOUR;
    var typeProp = constants.API.PROPERTIES.TRIMET.TYPE;
    var descProp = constants.API.PROPERTIES.TRIMET.DESCRIPTION;
    var endProp = constants.API.PROPERTIES.TRIMET.END;
    var beginProp = constants.API.PROPERTIES.TRIMET.BEGIN;
    var phoneticProp = constants.API.PROPERTIES.TRIMET.PHONETIC;

    /** conditional variables */
    var hasDetours = false;
    
    /** dataset counts */
    var detourCount = 0;
    var myDetourCount = 0;
    var locationCount = 0;

    /** API Parameters */
    var routeIdParam = constants.API.PARAMETERS.ROUTE_ID;
    var stopIdParam = constants.API.PARAMETERS.STOP_ID;

    var routeId = _.split(apiParams[routeIdParam], ',');
    var stopId = apiParams[stopIdParam];

    var returnedDetoursSpeech = undefined;
    var returnedRoutesSpeech = undefined;
    var detourCountSpeech = undefined;
    var detoursIntroSpeech = undefined;
    var detourSpeech = undefined;
    var stopNameSpeech = undefined;
    var responseSpeech = undefined;
    var pluralSpeech = undefined;

    var isAreSpeech = ut.getPlural('is', detourCount);
    var detoursPluralSpeech = ut.getPlural('detour', detourCount);
    var detours = [];
    var myDetours = [];
    
    var stopName = undefined;
    var transitType = undefined;
    var busName = undefined;
    var startDate = undefined;
    var endDate = undefined;
    var alertMessage = undefined;
    var phoneticSpeech = undefined;

    /** Extract sections from results */
    var detourData = dataset[detourProp];
    detourCount = ut.hasValidResponse(detourData) ? detourData.length : 0;

    /** Check if detours and arrivals are present */
    hasDetours = detourCount > 0;

        /** Cycle through detours and generate alert speech */
    if(hasDetours){
        /** Prepare Breif Intro */
        var affectedRoutes = [];
        var affectedRoutesCount = 0;
        var speech = undefined;

        /** Check if my route is affected by the detour */
        __.each(detourData, function(detour, key, list){
            /** get All Afected Routes */
            var routes = detour[routeProp];

            /** Cycle through Affected routes and Buses, Only get affected Buses for that route */
            __.each(routes, function(route, key, list){
                var type = route[typeProp];
                var desc = route[descProp];
                var rt = route[routeProp];

                transitType = constants.ENUM.TRIMET.ROUTE_TYPE[type];
                busName = ut.replaceSpecialCharacters(desc);
                speech = `${transitType} ${busName}`;

                if(__.contains(routeId, rt.toString())){
                    affectedRoutes.push(speech);
                }
            });

            var beginDateRaw = detour[beginProp];
            var endDateRaw = detour[endProp];
            var bdate = ut.convertTransitDateTime(beginDateRaw, userTimezone);
            var edate = ut.convertTransitDateTime(endDateRaw, userTimezone);
            var shortDateFormat = constants.DEFAULTS.SHORT_DATE_FORMAT;

            startDate = ut.expandDatetime(beginDateRaw, shortDateFormat);
            endDate = ut.expandDatetime(endDateRaw, shortDateFormat);
            alertMessage = ut.replaceSpecialCharacters(detour[descProp]);
            phoneticSpeech = ut.replaceSpecialCharacters(detour[phoneticProp]);

            returnedRoutesSpeech = ut.getTransitArraySentence(affectedRoutes);
            speech = `${returnedRoutesSpeech}, from ${startDate}, to, ${endDate}, ${phoneticSpeech}`;

            affectedRoutesCount = affectedRoutes.length;

            if(affectedRoutesCount > 0)
            {
                detours.push(speech);
                affectedRoutes.length = 0;
            }
        });

        /** Prepare Breif Intro */
        myDetourCount = detours.length;
        isAreSpeech = ut.getPlural('is', myDetourCount);
        detoursPluralSpeech = ut.getPlural('detour', myDetourCount);

        if(myDetourCount > 0)
        {
            detoursIntroSpeech = `There ${isAreSpeech} ${myDetourCount} ${detoursPluralSpeech}.`;
        }
        else
        {
            detoursIntroSpeech = `There ${isAreSpeech}, no ${detoursPluralSpeech}, at the moment.`;
        }
    }
    else
    {
        /** Prepare Breif Intro */
        isAreSpeech = ut.getPlural('is', detourCount);
        detoursPluralSpeech = ut.getPlural('detour', detourCount);
        detoursIntroSpeech = `There ${isAreSpeech}, no ${detoursPluralSpeech}, at the moment.`;
    }

    returnedDetoursSpeech= ut.getTransitArraySentence(detours);
    responseSpeech = `${detoursIntroSpeech} ${paragraph} ${returnedDetoursSpeech}.`;
    return responseSpeech;
}

function formatTrimetResponse(dataset, userTimezone, responseType, apiParams){
    /** Speech Pauses */
    var sentence = constants.BREAKTIME['SENTENCE'];
    var paragraph = constants.BREAKTIME['PARAGRAPH'];
    var pause = constants.BREAKTIME['100'];
    var midPause = constants.BREAKTIME['200'];
    var longPause = constants.BREAKTIME['350'];

    /** API Parameters */
    var routeIdParam = constants.API.PARAMETERS.ROUTE_ID;
    var stopIdParam = constants.API.PARAMETERS.STOP_ID;

    var routeId = _.split(apiParams[routeIdParam], ',');
    var stopId = apiParams[stopIdParam];

    /** Detour properties */
    var routeProp = constants.API.PROPERTIES.TRIMET.ROUTE;
    var detourProp = constants.API.PROPERTIES.TRIMET.DETOUR;
    var typeProp = constants.API.PROPERTIES.TRIMET.TYPE;
    var descProp = constants.API.PROPERTIES.TRIMET.DESCRIPTION;
    var endProp = constants.API.PROPERTIES.TRIMET.END;
    var beginProp = constants.API.PROPERTIES.TRIMET.BEGIN;
    
    /** arrivals properties */
    var inCongProp = constants.API.PROPERTIES.TRIMET.IN_CONGESTION;
    var arrivalProp = constants.API.PROPERTIES.TRIMET.ARRIVAL;
    var departedProp = constants.API.PROPERTIES.TRIMET.DEPARTED;
    var scheduledProp = constants.API.PROPERTIES.TRIMET.SCHEDULED;
    var shortSignProp = constants.API.PROPERTIES.TRIMET.SHORT_SIGN;
    var estimatedProp = constants.API.PROPERTIES.TRIMET.ESTIMATED;
    var detouredProp = constants.API.PROPERTIES.TRIMET.DETOURED;
    var fullSignProp = constants.API.PROPERTIES.TRIMET.FULL_SIGN;
    var statusProp = constants.API.PROPERTIES.STATUS;
    var locationProp = constants.API.PROPERTIES.LOCATION;
    var delayedProp = constants.API.PROPERTIES.TRIMET.IS_DELAYED;
    var delayminsProp = constants.API.PROPERTIES.TRIMET.DELAY_MINUTES;

    /** conditional variables */
    var inCongestion = false;
    var hasDeparted = false;
    var isDetoured = false;
    var hasEstimated = false;
    var hasScheduled = false;
    var hasDetoures = false;
    var hasArrivals = false;
    var hasLocation = false;
    var isDelayed = false;

    /** dataset counts */
    var detourCount = 0;
    var arrivalCount = 0;
    var locationCount = 0;
    var estimatedArrivalCount = 0;
    var scheduledArrivalCount = 0;
    var delayCount = 0;
    var delaymins = 0;
    var myDetourCount = 0;

    var returnedRoutesSpeech = undefined;
    var returnedArrivalsSpeech = undefined;
    var returnedScheduledArrivalsSpeech = undefined;
    var returnedEstimatedArrivalsSpeech = undefined;
    var returnedDelaysSpeech = undefined;

    var detourCountSpeech = undefined;
    var alertIntroSpeech = undefined;
    var alertsSpeech = undefined;
    var arrivalsIntroSpeech = undefined;
    var arrivalsSpeech = undefined;
    var stopNameSpeech = undefined;
    var responseSpeech = undefined;
    var introSpeech = undefined;
    var pluralSpeech = undefined;
    var delaysIntroSpeech = undefined;
    var delaysSpeech = undefined;

    var isAreSpeech = ut.getPlural('is', detourCount);
    var detoursPluralSpeech = ut.getPlural('alert', detourCount);
    var arrivalsPluralSpeech = ut.getPlural('arrival', arrivalCount);

    var detours = [];
    var arrivals = [];
    var estimatedArrivals = [];
    var scheduledArrivals = [];
    var delays = [];
    var myDetours = [];
    
    var stopName = undefined;
    var transitType = undefined;
    var busName = undefined;
    var startDate = undefined;
    var endDate = undefined;
    var alertMessage = undefined;

    /** Extract sections from results */
    var detourData = dataset[detourProp];
    var arrivalData = dataset[arrivalProp];
    var locationData = dataset[locationProp];

    detourCount = ut.hasValidResponse(detourData) ? detourData.length : 0;
    arrivalCount = ut.hasValidResponse(arrivalData) ? arrivalData.length : 0;
    locationCount = ut.hasValidResponse(locationData) ? locationData.length : 0;

    /** Check if detours and arrivals are present */
    hasDetoures = detourCount > 0;
    hasArrivals = arrivalCount > 0;
    hasLocation = locationCount > 0;

    /** get location Details */
    if(hasLocation){
        stopName = locationData[0][descProp];
        stopNameSpeech = ut.replaceSpecialCharacters(stopName);
    }

    /** Cycle through detours and generate alert speech */
    if(hasDetoures){
        var affectedRoutes = [];
        var affectedRoutesCount = 0;
        var speech = undefined;

        /** Check if my route is affected by the detour */
        __.each(detourData, function(detour, key, list){            
            /** get All Afected Routes */
            var routes = detour[routeProp];
            
            /** Cycle through Affected routes and Buses, Only get affected Buses for that route */
            __.each(routes, function(route, key, list){
                var type = route[typeProp];
                var desc = route[descProp];
                var rt = route[routeProp];

                transitType = constants.ENUM.TRIMET.ROUTE_TYPE[type];
                busName = ut.replaceSpecialCharacters(desc);
                speech  = `${transitType}, ${busName}`;
                
                if(__.contains(routeId, rt.toString())){
                    affectedRoutes.push(speech);
                }
            });

            var beginDateRaw = detour[beginProp];
            var endDateRaw = detour[endProp];
            var bdate = ut.convertTransitDateTime(beginDateRaw, userTimezone);
            var edate = ut.convertTransitDateTime(endDateRaw, userTimezone);
            var shortDateFormat = constants.DEFAULTS.SHORT_DATE_FORMAT;

            startDate = ut.expandDatetime(beginDateRaw, shortDateFormat);
            endDate = ut.expandDatetime(endDateRaw, shortDateFormat);
            alertMessage = ut.replaceSpecialCharacters(detour[descProp]);

            returnedRoutesSpeech = ut.getTransitArraySentence(affectedRoutes);
            speech = `In effect for ${returnedRoutesSpeech}, from ${startDate}, to, ${endDate}, ${alertMessage}`;

            affectedRoutesCount = affectedRoutes.length;
            
            if(affectedRoutesCount > 0)
            {
                detours.push(speech);
                affectedRoutes.length = 0;
            }
        });

        /** Prepare Breif Intro */
        myDetourCount = detours.length;
        isAreSpeech = ut.getPlural('is', myDetourCount);
        detoursPluralSpeech = ut.getPlural('alert', myDetourCount);

        if(myDetourCount > 0)
        {
            alertIntroSpeech = `There ${isAreSpeech} ${myDetourCount} ${detoursPluralSpeech}, on ${stopNameSpeech},`;
        }
        else
        {
            alertIntroSpeech = `There ${isAreSpeech} no ${detoursPluralSpeech}, on ${stopNameSpeech}.`;
        }
    }
    else
    {
        /** Prepare Breif Intro */
        isAreSpeech = ut.getPlural('is', detourCount);
        detoursPluralSpeech = ut.getPlural('alert', detourCount);
        alertIntroSpeech = `There ${isAreSpeech} no ${detoursPluralSpeech}, on ${stopNameSpeech}.`;
    }

    

    /** Cycle Through Arrivals and Prepare arrivals speech */
    if(hasArrivals){
        /** Prepare Speech */
        isAreSpeech = ut.getPlural('is', arrivalCount);
        arrivalsPluralSpeech = ut.getPlural('arrival', arrivalCount);
        arrivalsIntroSpeech = `I found, ${arrivalCount}, ${arrivalsPluralSpeech}.`;

        __.each(arrivalData, function(value, key, list){
            var context = list[key];
            inCongestion = context[inCongProp];
            hasDeparted = context[departedProp];
            hasScheduled = ut.hasKey(context, scheduledProp);
            hasEstimated = ut.hasKey(context, estimatedProp);
            isDetoured = context[detouredProp];

            var speech = undefined;
            var estDate = undefined;
            var schDate = undefined;
            var scheduledAtSpeech = undefined;
            var estimatedArrivalSpeech = undefined;

            var usertime = undefined;
            var busDetails = ut.replaceSpecialCharacters(context[shortSignProp]);
            var busStatus = context[statusProp];
            var scheduledDateTime = undefined;
            var estimatedDateTime = undefined;
            var arrivalTense = undefined;
            var status = undefined;

            switch (busStatus) {
                case scheduledProp:
                    scheduledDateTime = context[scheduledProp];
                    schDate = ut.convertTransitDateTime(scheduledDateTime, userTimezone);
                    scheduledAtSpeech = ut.formatTransitTimes(schDate, userTimezone);
                    speech = `${busDetails}, scheduled ${scheduledAtSpeech}.`;
                    scheduledArrivals.push(speech);
                    break;
                case estimatedProp:
                    scheduledDateTime = context[scheduledProp];
                    estimatedDateTime = context[estimatedProp];
                    estDate = ut.convertTransitDateTime(estimatedDateTime, userTimezone);
                    schDate = ut.convertTransitDateTime(scheduledDateTime, userTimezone);
                    usertime = ut.getUsertime(userTimezone);
                    status = ut.getArrivalStatus(usertime,schDate, estDate);

                    arrivalTense = ut.getArrivaltense(usertime, estDate);
                    scheduledAtSpeech = ut.formatTransitTimes(schDate, userTimezone);
                    estimatedArrivalSpeech = ut.getTimetoEvent(usertime, estDate);
                    speech = `${busDetails}, scheduled ${scheduledAtSpeech}, ${arrivalTense} ${status}, ${estimatedArrivalSpeech}.`;
                    var schedulesSpeech = `${busDetails}, scheduled ${scheduledAtSpeech}.`;
                    estimatedArrivals.push(speech);

                    /** Add delayed property to result and add to delays list */
                    var delayDetails = ut.isDelayed(scheduledDateTime, estimatedDateTime);
                    
                    isDelayed = delayDetails[delayedProp];
                    delaymins = delayDetails[delayminsProp];
                    var delayPlural = ut.getPlural('minute', delaymins);

                    if(isDelayed){
                        speech = `${busDetails}, ${delaymins} ${delayPlural} delay.`;
                        delays.push(speech);
                    }
                    break;
                default:
                    break;
            }
            
            /** Add to arrivals */
            arrivals.push(speech);
        });
    }
    else
    {
        isAreSpeech = ut.getPlural('is', arrivalCount);
        arrivalsPluralSpeech = ut.getPlural('arrival', arrivalCount);
        arrivalsIntroSpeech = `There ${isAreSpeech} no ${arrivals} at the moment.`;
    }

    /** Return briefing Speech */
    returnedRoutesSpeech = ut.getTransitArraySentence(detours);
    returnedArrivalsSpeech = ut.getTransitArraySentence(arrivals);
    returnedEstimatedArrivalsSpeech = ut.getTransitArraySentence(estimatedArrivals);
    returnedScheduledArrivalsSpeech = ut.getTransitArraySentence(scheduledArrivals);
    returnedDelaysSpeech = ut.getTransitArraySentence(delays);

    
    /** Switch formatingType and return processed speech */
    switch (responseType) {
        case constants.API.RESPONSE.BRIEFING:   
        case constants.API.RESPONSE.FLASH:
        case constants.API.RESPONSE.SUMMARY:
            alertsSpeech = `${alertIntroSpeech} ${paragraph} ${returnedRoutesSpeech}`;
            arrivalsSpeech = `${arrivalsIntroSpeech} ${paragraph} ${returnedArrivalsSpeech}`;
            responseSpeech = `${alertsSpeech} ${paragraph} ${arrivalsSpeech}`;
            break;
        case constants.API.RESPONSE.SERVICE_ALERTS:
        case constants.API.RESPONSE.ALERTS:
            responseSpeech = detourCount > 0 ? `${alertIntroSpeech} ${paragraph} ${returnedRoutesSpeech}` : `There are no alerts for ${stopNameSpeech}.`;
            break;
        case constants.API.RESPONSE.ARRIVALS:
            estimatedArrivalCount = estimatedArrivals.length;
            pluralSpeech = ut.getPlural('arrival', estimatedArrivalCount);
            introSpeech = estimatedArrivalCount > 0 ? `I found ${estimatedArrivalCount}, ${pluralSpeech}.` : `There are no arrivals for ${stopNameSpeech}.`;
            responseSpeech = `${introSpeech} ${paragraph} ${returnedEstimatedArrivalsSpeech}`;
            break;
        case constants.API.RESPONSE.SCHEDULES:
            scheduledArrivalCount = arrivals.length;
            pluralSpeech = ut.getPlural('Schedule', scheduledArrivalCount);
            introSpeech = scheduledArrivalCount > 0 ? `I found ${scheduledArrivalCount}, ${pluralSpeech}.` : `There are no schedules for ${stopNameSpeech}.`;
            responseSpeech = `${introSpeech} ${paragraph} ${returnedArrivalsSpeech}`;
            break;
        case constants.API.RESPONSE.DELAYS:
            delayCount = delays.length;
            pluralSpeech = ut.getPlural('Delay', delayCount);
            introSpeech = delayCount > 0 ? `I found ${delayCount}, ${pluralSpeech} for ${stopNameSpeech}.` : `There are no delays for ${stopNameSpeech}.`;
            responseSpeech = `${introSpeech} ${paragraph} ${returnedDelaysSpeech}`;
            break;
        default:
            break;
    }

    /** Return Response */
    return responseSpeech;
}

/** Extract and return serving agencies in a given State */
function formatAgenciesCovered(dataset){
    /** Extract and format Agency List for User Response */
    var agencies = [];

    var resultSet = dataset[constants.API.PROPERTIES.OBA.DATA];
    var agencyList = resultSet[constants.API.PROPERTIES.OBA.LIST];
    var ReferenceList = resultSet[constants.API.PROPERTIES.OBA.REFERENCES];
    var agenciesRef = ReferenceList[constants.API.PROPERTIES.OBA.AGENCIES];
    var agencyCount = agencyList.length;

    /** Cycle through agency list and extract reference data */
    __.each(agencyList, function(agency, key, list){
        var ag = {};
        var filter = {};
        
        ut.setDirectProperties(agency, ag, constants.API.PROPERTIES.OBA.AGENCY_ID);
        ut.setDirectProperties(agency, ag, constants.API.PROPERTIES.OBA.LATITUDE);
        ut.setDirectProperties(agency, ag, constants.API.PROPERTIES.OBA.LONGIUDE);

        /** get Agency Details from Reference List */
        filter[constants.API.PROPERTIES.OBA.ID] = ag[constants.API.PROPERTIES.OBA.AGENCY_ID];
        var refSet = ut.selectFromJsonResult(agenciesRef, filter);

        /** Extract Agency name and timezone from agency reference */
        ut.setDirectProperties(refSet[0], ag, constants.API.PROPERTIES.OBA.NAME);
        ut.setDirectProperties(refSet[0], ag, constants.API.PROPERTIES.OBA.TIMEZONE);
        
        agencies.push(ag);
    });

    return agencies;
}

function formatOBAStops(dataset){
    var ds = undefined;
    var enteryProp = constants.API.PROPERTIES.OBA.ENTRY;
    var referencesProp = constants.API.PROPERTIES.OBA.REFERENCES;
    var routesProp = constants.API.PROPERTIES.OBA.ROUTES;

    var resultSet = dataset;
    var entry = resultSet[enteryProp];
    var references = resultSet[referencesProp];
    var routes = references[routesProp];

    ds = entry;
    ds[routesProp] = routes;

    return ds;
}

function speakOBAStopsAndRoutes(dataset){
    var codeProp = constants.API.PROPERTIES.OBA.CODE;
    var directionProp = constants.API.PROPERTIES.OBA.DIRECTION;
    var nameProp = constants.API.PROPERTIES.OBA.NAME;
    var routesProp = constants.API.PROPERTIES.OBA.ROUTES;
    var idProp = constants.API.PROPERTIES.OBA.ID;
    var longNameProp = constants.API.PROPERTIES.OBA.LONG_NAME;
    var shortNameProp = constants.API.PROPERTIES.OBA.SHORT_NAME;
    var descriptionProp = constants.API.PROPERTIES.OBA.DESCRIPTION;

    var routes = [];
    var routesSpeech = undefined;
    var speechOutput = undefined;
    var pause = constants.BREAKTIME['150'];
    var addressSSML = constants.ENUM.SSML.SPEAK_AS.ADDRESS;

    var stopIdSpeech = ut.spellDigitOutput(dataset[codeProp]);
    var stopName = dataset[nameProp];
    var stopNameSpeech = ut.replaceSpecialCharacters(stopName);
    var direction = dataset[directionProp];
    var directionExpand = !__.isEmpty(direction) ?  ut.replaceSpecialCharacters(direction) : "";
    var directionSpeech = !__.isEmpty(direction) ? `${directionExpand} bound` : "";

    __.each(dataset[routesProp], function(value, key, list){
        var rId = ut.getIdFromCode(value[idProp]);
        var rName = value[longNameProp] || value[shortNameProp];
        var description = value[descriptionProp];
        var descripSpeech = ut.replaceSpecialCharacters(description);
        var speech = `Route, ${ut.spellDigitOutput(rId)}, ${ut.replaceSpecialCharacters(rName)}, ${pause} ${descripSpeech}`;
        routes.push(speech);
    });

    routesSpeech = ut.getTransitArraySentence(routes);
    var routesCount = routes.length || 0;
    var routePluralSpeech = ut.getPlural("route", routesCount);
    /** This cause too many route speeches */
    //speechOutput = `Stop ID ${stopIdSpeech}, ${stopNameSpeech}, ${directionSpeech}, Serving, ${routesSpeech}`;
    speechOutput = `Stop ID ${stopIdSpeech}, ${stopNameSpeech}, ${directionSpeech}, Serving, ${routesCount} ${routePluralSpeech}.`;
    return speechOutput;
}

function formatOBAStopsForAgency(dataset, agencyId){
    var ds = undefined;
    var refs = dataset[constants.API.PROPERTIES.OBA.REFERENCES];
    var agenciesRef = refs[constants.API.PROPERTIES.OBA.AGENCIES];
    var routesRef = refs[constants.API.PROPERTIES.OBA.ROUTES];

    var idProp = constants.API.PROPERTIES.OBA.ID;
    var routeIdsProp = constants.API.PROPERTIES.OBA.ROUTE_IDS;
    var stopsProp = constants.API.PROPERTIES.OBA.STOPS;
    var routesProp = constants.API.PROPERTIES.OBA.ROUTES;

    var resultSet = dataset[constants.API.PROPERTIES.OBA.LIST];
    var foundStops = [];

    __.each(resultSet, function(stop, key, list){
        var stopId  = stop[idProp];
        var stopAgencyId = ut.getAgencyIdFromStop(stopId);
        var ds = {};

        if(parseInt(stopAgencyId) === parseInt(agencyId)){
            /** Get reference details for stop route IDs */
            var rts = stop[routeIdsProp];
            var bucket = [];

            __.each(rts, function(route, key, list){
                var filter = {};
                filter[idProp] = route;
                var rt = ut.selectFromJsonResult(routesRef, filter);
                bucket.push(__.first(rt));
            });

            stop[routesProp] = bucket;
            foundStops.push(stop);
        }
    });

    /** Add to return Object */
    ds = foundStops;
    return ds;
}

function processOBAArrivalsAndDepartures(dataset, userTimezone, responseType, apiParams){
    /** Output object */
    var ds = undefined;

    /** API Parameters */
    var routeIdParam = constants.API.PARAMETERS.OBA.ROUTE_ID;
    var stopIdParam = constants.API.PARAMETERS.OBA.STOP_ID;
    var agencyIdParam = constants.API.PARAMETERS.OBA.AGENCY_ID;

    /** API Results Propperties */
    var entryProp = constants.API.PROPERTIES.OBA.ENTRY;
    var referencseProp = constants.API.PROPERTIES.OBA.REFERENCES;
    var arrivalsDeparturesProp = constants.API.PROPERTIES.OBA.ARRIVALS_AND_DEPARTURES;
    var stopIdProp = constants.API.PROPERTIES.OBA.STOP_ID;
    var situationIdsProp = constants.API.PROPERTIES.OBA.SITUATION_IDS;
    var stopsProp = constants.API.PROPERTIES.OBA.STOPS;
    var tripsProp = constants.API.PROPERTIES.OBA.TRIPS;
    var situationsProp = constants.API.PROPERTIES.OBA.SITUATIONS;
    var routesProp = constants.API.PROPERTIES.OBA.ROUTES;
    var agenciesProp = constants.API.PROPERTIES.OBA.AGENCIES;
    var idProp = constants.API.PROPERTIES.OBA.ID;
    var nameProp = constants.API.PROPERTIES.OBA.NAME;
    var directionProp = constants.API.PROPERTIES.OBA.DIRECTION;

    var routeId = apiParams[routeIdParam];
    var stopId = apiParams[stopIdParam];
    var agencyId = apiParams[agencyIdParam];
    var stripCode = ut.getIdFromCode(stopId);
    var stopCode = `${agencyId}_${stripCode}`;

    /** Extract sections from results */
    var entrySet = dataset[entryProp];
    var referenceSet = dataset[referencseProp];
    var arrivalsDepartures = entrySet[arrivalsDeparturesProp];
    var situationsIds = entrySet[situationIdsProp];
    var stopsRef = referenceSet[stopsProp];
    var tripsRef = referenceSet[tripsProp];
    var situationsRef = referenceSet[situationsProp];
    var routesRef = referenceSet[routesProp];
    var agenciesRef = referenceSet[agenciesProp];

    var arrivalsAndDepartures = [];
    var trips = [];
    var routes = [];
    var situations = [];
    var agencies = [];
    var stops = [];

    /** Get only Details for Provided Stop Id */
    __.each(arrivalsDepartures, function(ad, key, list){
        if(ad[stopIdProp] === stopCode){
            /** Get filter for accessing refereneced Stop details */
            var filter = {};
            filter[idProp] = ad[stopIdProp] 
            var ref = ut.selectFromJsonResult(stopsRef, filter);      

            /** Add Stop Attribues to Arrivals and Departures */    
            if(ref.length > 0){
                ut.setDirectProperties(_.first(ref), ad, nameProp);
                ut.setDirectProperties(_.first(ref), ad, directionProp);
            }  
            
            /** reset Filter variable for reuse */
            filter = {};

            /** Add Situations TODO: */
            var situationIds = ad[situationIdsProp];
            ad[situationsProp] = [];

            __.each(situationIds, function(id){
                filter[idProp] = id;
                var ref = ut.selectFromJsonResult(situationsRef, filter);

                if(ref.length > 0){
                    (ad[situationsProp]).push(ref);
                }
            });

            /** Push properties to Final Object */
            arrivalsAndDepartures.push(ad);
        }
    });

    ds = arrivalsAndDepartures;
    return ds;
}

function formatOBAArrivalsAndDepartures(dataset, userTimezone, responseType){    
    /** API Response Properties  */
    var predictedProp = constants.API.PROPERTIES.OBA.PREDICTED;
    var predictedArrivalTimeProp = constants.API.PROPERTIES.OBA.PREDICTED_ARRIVAL_TIME;
    var sheduledArrivalTimeProp = constants.API.PROPERTIES.OBA.SCHEDULED_ARRIVAL_TIME;
    var situationsProp = constants.API.PROPERTIES.OBA.SITUATIONS;
    var delayedProp = constants.API.PROPERTIES.IS_DELAYED;
    var delayminsProp = constants.API.PROPERTIES.DELAY_MINUTES;
    var transitStatusProp = constants.API.PROPERTIES.TRANSIT_STATUS;
    var arrivalsProp = constants.API.PROPERTIES.OBA.ARRIVALS;
    var departuresProp = constants.API.PROPERTIES.OBA.DEPARTURES;
    var delaysProp = constants.API.PROPERTIES.OBA.DELAYS;
    var nameProp = constants.API.PROPERTIES.OBA.NAME;

    /** Assertions */
    var hasScheduledArrival = false;
    var hasPredictedArrival = false;
    var hasPrediction = false;
    var isDelayed = false;
    var mySituations = [];
    var myArrivals = [];
    var mySchedules = [];
    var myDelays = [];

    var statusMinutes = undefined;
    var scheduledArrival = undefined;
    var predictedArrival = undefined;
    var usertime = undefined;
    var transitStatus = undefined;
    var delayDetails = undefined;
    var stopName = undefined;

    /** Aggregate Data */
    __.each(dataset, function(ad, key, list){
        var situations = ad[situationsProp];
        stopName = ut.replaceSpecialCharacters(ad[nameProp]);
        
        /** get Situations */
        __.each(situations, function(sit, key , list){
            /** TODO: Ensure unique situation IDs */
            mySituations.push(sit);
        });

        /** Get Delays */
        hasPrediction = ut.hasKey(ad, predictedProp) ? ad[predictedProp] : false;

        if(hasPrediction)
        {
            hasScheduledArrival = ut.hasKey(ad, sheduledArrivalTimeProp);
            hasPredictedArrival = ut.hasKey(ad, predictedArrivalTimeProp);
            scheduledArrival = hasScheduledArrival ?  ad[sheduledArrivalTimeProp] : null;
            predictedArrival = hasPredictedArrival ? ad[predictedArrivalTimeProp] : null;
            schDate = ut.convertTransitDateTime(scheduledArrival, userTimezone);
            prdDate = ut.convertTransitDateTime(predictedArrival, userTimezone);
            usertime = ut.getUsertime(userTimezone);

            transitStatus = ut.getArrivalStatus(usertime,schDate, prdDate);
            delayDetails = ut.isDelayed(scheduledArrival, predictedArrival);
            isDelayed = delayDetails[delayedProp];
            statusMinutes = delayDetails[delayminsProp];

            ad[delayedProp] = isDelayed;
            ad[delayminsProp] = statusMinutes;
            ad[transitStatusProp] = transitStatus;

            if(isDelayed)
            {
                myDelays.push(ad);
            }

            myArrivals.push(ad);
        }
        else
        {
            mySchedules.push(ad);
        }
    });

    switch (responseType) {
        case constants.API.RESPONSE.BRIEFING:
            var br = {};
            br[situationsProp] = mySituations.length;
            br[arrivalsProp] = myArrivals.length;
            br[departuresProp] = mySchedules.length;
            br[delaysProp] = myDelays.length;
            br[nameProp] = stopName;
            return br;
        case constants.API.RESPONSE.ALERTS:
        case constants.API.RESPONSE.DETOURES:
            return mySituations;
        case constants.API.RESPONSE.ARRIVALS:
            return myArrivals;
        case constants.API.RESPONSE.SCHEDULES:
            return mySchedules;
        case constants.API.RESPONSE.DELAYS:
            return myDelays;
        default:
            return null;;
    }
}


function speakOBAArrivalsAndDepartures(dataset, userTimezone, responseType){
    /** Properties */
    var predictedArrivalTimeProp = constants.API.PROPERTIES.OBA.PREDICTED_ARRIVAL_TIME;
    var scheduledArrivalTimeProp = constants.API.PROPERTIES.OBA.SCHEDULED_ARRIVAL_TIME;
    var nameProp = constants.API.PROPERTIES.OBA.NAME;
    var directionProp = constants.API.PROPERTIES.OBA.DIRECTION;
    var routeShortNameProp = constants.API.PROPERTIES.OBA.ROUTE_SHORT_NAME;
    var routeLongNameProp = constants.API.PROPERTIES.OBA.ROUTE_LONG_NAME;
    var tripHeadSignProp = constants.API.PROPERTIES.OBA.TRIP_HEAD_SIGN;
    var situationsProp = constants.API.PROPERTIES.OBA.SITUATIONS;
    var delayedProp = constants.API.PROPERTIES.IS_DELAYED;
    var delayminsProp = constants.API.PROPERTIES.DELAY_MINUTES;
    var transitStatusProp = constants.API.PROPERTIES.TRANSIT_STATUS;
    var arrivalsProp = constants.API.PROPERTIES.OBA.ARRIVALS;
    var departuresProp = constants.API.PROPERTIES.OBA.DEPARTURES;
    var delaysProp = constants.API.PROPERTIES.OBA.DELAYS;

    /** Speech Pauses */
    var sentence = constants.BREAKTIME['SENTENCE'];
    var paragraph = constants.BREAKTIME['PARAGRAPH'];
    var pause = constants.BREAKTIME['150'];
    var midPause = constants.BREAKTIME['200'];
    var longPause = constants.BREAKTIME['350'];

    /**  Speeches variables */
    var speechOutput = undefined;
    var promptSpeech = undefined;
    var introSpeech = undefined;
    var messageSpeech = undefined;
    var situationpluralSpeech = undefined;
    var situationSpeech = undefined;
    var alertPluralSpeech = undefined;
    var alertSpeech = undefined;
    var arrivalPluralSpeech = undefined;
    var arrivalSpeech = undefined;
    var schedulePluralSpeech = undefined;
    var scheduleSpeech = undefined;
    var delayPluralSpeech = undefined;
    var delaySpeech = undefined;
    var detourPluralSpeech = undefined;
    var detourSpeech = undefined;

    /** Assertions */
    var hasSituations = false;
    var hasAlerts = false;
    var hasArrivals = false;
    var hasSchedules = false;
    var hasDelays = false;
    var hasDetours = false;
    var hasBriefing = false;
    var hasData = false;

    /** variables */
    var situationsCount = 0;
    var alertsCount = 0;
    var detoursCount = 0;
    var arrivalsCount = 0;
    var schedulesCount = 0;
    var delaysCount = 0;
    
    switch (responseType) {
        case constants.API.RESPONSE.BRIEFING:
            hasBriefing = !__.isNull(dataset) && !__.isEmpty(dataset);
            hasSituations = hasBriefing && ut.hasKey(dataset, situationsProp);
            hasArrivals = hasBriefing && ut.hasKey(dataset, arrivalsProp);
            hasSchedules = hasBriefing && ut.hasKey(dataset, departuresProp);
            hasDelays = hasBriefing && ut.hasKey(dataset, delaysProp);

            var sit =  dataset[situationsProp];
            var arr = dataset[arrivalsProp];
            var sch = dataset[departuresProp];
            var dly = dataset[delaysProp];
            var stopName = ut.replaceSpecialCharacters(dataset[nameProp]);

            situationsCount = hasSituations && !__.isNull(sit) ? sit: 0;
            arrivalsCount = hasArrivals && !__.isNull(arr) ? arr : 0;
            schedulesCount = hasSchedules && !__.isNull(sch) ? sch : 0;
            delaysCount = hasDelays && !__.isNull(dly) ? dly : 0;

            situationpluralSpeech = ut.getPlural("situation", situationsCount);
            arrivalPluralSpeech = ut.getPlural("arrival", arrivalsCount);
            schedulePluralSpeech = ut.getPlural("schedule", schedulesCount);
            delayPluralSpeech = ut.getPlural("delay", delaysCount);

            situationSpeech = situationsCount > 0 ? `${situationsCount} ${situationpluralSpeech}` : `no ${situationpluralSpeech}`;
            arrivalSpeech = arrivalsCount > 0 ? `${arrivalsCount} ${arrivalPluralSpeech}` : `no ${arrivalPluralSpeech}`;
            scheduleSpeech = schedulesCount > 0 ? `${schedulesCount} ${schedulePluralSpeech}` : `no ${schedulePluralSpeech}`;
            delaySpeech = delaysCount > 0 ? `${delaysCount} ${delayPluralSpeech}` : `no ${delayPluralSpeech}`;

            speechOutput = `There are ${situationSpeech} reported. ${pause} I found ${arrivalSpeech}, ${scheduleSpeech}, and ${delaySpeech} for ${stopName}. ${pause}`;
            return speechOutput;
        case constants.API.RESPONSE.ARRIVALS:
        case constants.API.RESPONSE.DELAYS:
            hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
            var stopName = hasData && ut.hasKey(dataset, nameProp) ?  dataset[nameProp] : null;
            var direction = hasData && ut.hasKey(dataset, directionProp) ? dataset[directionProp] : null;
            var longRouteName = hasData && ut.hasKey(dataset, routeLongNameProp) ? dataset[routeLongNameProp] : null;
            var shortRoueName = hasData && ut.hasKey(dataset, routeShortNameProp) ? dataset[routeShortNameProp] : null;
            var scheduledDateTime = hasData && ut.hasKey(dataset, scheduledArrivalTimeProp) ? dataset[scheduledArrivalTimeProp] : null;
            var predictedDateTime = hasData && ut.hasKey(dataset, predictedArrivalTimeProp) ? dataset[predictedArrivalTimeProp] : null;
            var transitStatus = hasData && ut.hasKey(dataset, transitStatusProp) ? dataset[transitStatusProp] : null;
            var tripHeadSign = hasData && ut.hasKey(dataset, tripHeadSignProp) ? dataset[tripHeadSignProp] : null;
            var minutes = hasData && ut.hasKey(dataset, delayminsProp) ? dataset[delayminsProp] : null;
            var minutesCorrection = minutes < 0 ? 0 : minutes;
            var minutesPluralSpeech = ut.getPlural("minute", minutesCorrection);
            
            var tripHeadSignSpeech = !__.isEmpty(tripHeadSign) ? `service to ${ut.replaceSpecialCharacters(tripHeadSign)}` : "";
            var stopNameSpeech = ut.replaceSpecialCharacters(stopName);

            var schDate = ut.convertTransitDateTime(scheduledDateTime, userTimezone);
            var prdDate = ut.convertTransitDateTime(predictedDateTime, userTimezone);
            var usertime = ut.getUsertime(userTimezone);

            var scheduledDateTimeSpeech = ut.formatTransitTimes(schDate, userTimezone);
            var directionSpeech = !__.isEmpty(direction) ? `${ut.replaceSpecialCharacters(direction)} bound` : "";
            var routeName = longRouteName || shortRoueName || "";
            var routeNameSpeech = ut.replaceSpecialCharacters(routeName);

            var transitStatus = ut.getArrivalStatus(usertime,schDate, prdDate);
            var arrivalTense = ut.getArrivaltense(usertime, prdDate);
            var pridictedSpeech = ut.getTimetoEvent(usertime, prdDate);

            speechOutput = `${directionSpeech}, ${tripHeadSignSpeech}, via route, ${routeNameSpeech}. Scheduled, ${scheduledDateTimeSpeech}, and, ${arrivalTense} ${transitStatus} ${pridictedSpeech}`;
            return speechOutput;
        case constants.API.RESPONSE.SCHEDULES:
            hasData = !__.isNull(dataset) && !__.isEmpty(dataset);
            var stopName = hasData && ut.hasKey(dataset, nameProp) ?  dataset[nameProp] : null;
            var direction = hasData && ut.hasKey(dataset, directionProp) ? dataset[directionProp] : null;
            var longRouteName = hasData && ut.hasKey(dataset, routeLongNameProp) ? dataset[routeLongNameProp] : null;
            var shortRoueName = hasData && ut.hasKey(dataset, routeShortNameProp) ? dataset[routeShortNameProp] : null;
            var scheduledDateTime = hasData && ut.hasKey(dataset, scheduledArrivalTimeProp) ? dataset[scheduledArrivalTimeProp] : null;
            var transitStatus = hasData && ut.hasKey(dataset, transitStatusProp) ? dataset[transitStatusProp] : null;
            var tripHeadSign = hasData && ut.hasKey(dataset, tripHeadSignProp) ? dataset[tripHeadSignProp] : null;
            
            
            var tripHeadSignSpeech = !__.isEmpty(tripHeadSign) ? `service to ${ut.replaceSpecialCharacters(tripHeadSign)}` : "";
            var stopNameSpeech = ut.replaceSpecialCharacters(stopName);
            var schDate = ut.convertTransitDateTime(scheduledDateTime, userTimezone);
            var scheduledDateTimeSpeech = ut.formatTransitTimes(schDate, userTimezone);
            var directionSpeech = !__.isEmpty(direction) ? `${ut.replaceSpecialCharacters(direction)} bound` : "";
            var routeName = longRouteName || shortRoueName || "";
            var routeNameSpeech = ut.replaceSpecialCharacters(routeName);

            speechOutput = `${directionSpeech}, ${tripHeadSignSpeech}, via route, ${routeNameSpeech}. Scheduled, ${scheduledDateTimeSpeech}.`;
            return speechOutput;
        case constants.API.RESPONSE.DETOURES:
        case constants.API.RESPONSE.ALERTS:
            speechOutput = "";
            return speechOutput;
        default:
            return "";
    }
}


/** Export for use in other files */
module.exports = {
    formatLocationData: formatLocationData,
    formatTimezoneData : formatTimezoneData,
    addDistanceSortTrimet : addDistanceSortTrimet,
    formatTrimetStopLocation : formatTrimetStopLocation,
    formatRandomFacts : formatRandomFacts,
    formatWeather : formatWeather,
    formatPlace : formatPlace,
    formatFoundStop : formatFoundStop,
    formatZipCodeData : formatZipCodeData,
    formatFoundTrimetRoutesAndBuses : formatFoundTrimetRoutesAndBuses,
    formatTrimetResponse : formatTrimetResponse,
    formatTrimetDetourResponse : formatTrimetDetourResponse,
    speakBARTStationLocation : speakBARTStationLocation,
    speakStopAndStationDetails : speakStopAndStationDetails,
    addDistanceSortOBA : addDistanceSortOBA,
    formatAgenciesCovered : formatAgenciesCovered,
    formatOBAStops : formatOBAStops,
    speakOBAStopsAndRoutes : speakOBAStopsAndRoutes,
    formatOBAStopsForAgency : formatOBAStopsForAgency,
    processOBAArrivalsAndDepartures : processOBAArrivalsAndDepartures,
    formatOBAArrivalsAndDepartures : formatOBAArrivalsAndDepartures,
    speakOBAArrivalsAndDepartures : speakOBAArrivalsAndDepartures
}