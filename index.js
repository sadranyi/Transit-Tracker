/**Import Utility.js files to gain access to helper functions defined in it */
var ut = require('./utility');
var api = require('./api');
var Alexa = require('alexa-sdk');
var cfg = require('./config');
var res = require('./resources');
var __ = require('underscore');
var _ = require('lodash');
var constants = require('./constants');
var startHandlers = require('./startHandlers');
var setupHandlers = require('./setupHandlers');
var fmt = require('./formating');

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = cfg.ALEXA.APP_ID;
    alexa.dynamoDBTableName = cfg.ALEXA.SESSION_DYNAMODB_TABLE_NAME;
    alexa.resources = res;
    alexa.registerHandlers(NewSessionHandler, startHandlers, setupHandlers);
    alexa.execute();
}

/** Catch-All Entry point into skill */
var NewSessionHandler = {
    'NewSession' : function(){
        /** Get Device Status */
        var isNewDevice = ut.isNewDevice.call(this);
        var isReadyDevice = ut.isReadyDevice.call(this);

        /** Set user Locale for Speech Processing */
        ut.initAttribute.call(this, constants.ATTRIBUTES.LOCALE, this.event.request.locale);

        /** Set Skill Mode */
        this.handler.state = !isNewDevice && isReadyDevice ? constants.STATES.STARTMODE : constants.STATES.SETUPMODE;

        /** Set Session Context before emiiting */
        ut.initAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.NEW_SESSION);
        
        /** Determin Request Type and Respond Appropriately */
        if(this.event.request.type === constants.ALEXA.REQUEST_TYPE.LAUNCH_REQUEST)
        {
            if(this.handler.state === constants.STATES.SETUPMODE){
                /** Initialize attributes needed for setup [SETUP_ATTEMPS , SETUP_LIMITS]*/
                ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_ATTEMPTS, 0);
                ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_LIMIT , cfg.APP.SETUP_LIMIT);
                ut.initAttribute.call(this, constants.ATTRIBUTES.TRIES_LEFT, cfg.APP.SETUP_LIMIT);

                /** Set Session Context */
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.SETUP_LAUNCH_REQUEST);
                this.emit('launchSetupMode');
            }     
            else
            {
                /** Set Session Context */
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.START_LAUNCH_REQUEST);
                this.emit('Welcome');
            }
        }
        else if(this.event.request.type === constants.ALEXA.REQUEST_TYPE.INTENT_REQUEST)
        {
            /** Initialize attributes needed for setup [SETUP_ATTEMPS , SETUP_LIMITS]*/
            ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_ATTEMPTS, 0);
            ut.initAttribute.call(this, constants.ATTRIBUTES.SETUP_LIMIT , cfg.APP.SETUP_LIMIT);
            ut.initAttribute.call(this, constants.ATTRIBUTES.TRIES_LEFT, cfg.APP.SETUP_LIMIT);

            /** Set Session Context */
            ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.DIRECT_INTENT_REQUEST);
            var intentName = this.event.request.intent.name;
            this.emitWithState(intentName);
        }
        else
        {
            var exclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), constants.DEFAULTS.SORRY_EXCLAMATION);
            var speechOutput = this.t('UNKNOWN_REQUEST_MESSAGE', exclamation);
            var promptSpeech = this.t('UNKNOWN_REQUEST_PROMPT') + this.t('REQUEST_FOR_RESPONSE');

            /** Set Application Context */
            ut.initAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.UNKNOWN_REQUEST);

            /** Persisit SpeechOut for Help or repeat Intents */
            ut.keepForRepeat.call(this, speechOutput, promptSpeech);

            /** Emit Response */
            this.emit(':ask', speechOutput, promptSpeech);
        }
    },

    /** Handles EndSession Requests */
    'EndSession' : function(message){
        var pause = constants.BREAKTIME['350'];
        var longPause = constants.BREAKTIME['400'];
        var goodbyeSpeech = this.t('DEFAULT_GOODBYE_MESSAGE');
        var quoteIntro = "";
        var quoteMessage = "";
        var jsData = undefined;
        var dataset = undefined;
        var hasData = false;
        var randomQuote = {};
        var myIntent = this;
        
        /** Get reference to current session State before clearing */
        var currentMode = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STATE);
        var userCountry =  __.isEmpty(this.attributes) ? constants.DEFAULTS.COUNTRY : ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY);
        var userTimezone = __.isEmpty(this.attributes) ? constants.DEFAULTS.TIMEZONE : ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TIMEZONE);
        var seasonGreetings = ut.getSeasonGreetings(userCountry, userTimezone) || "";

        /** Clear and recreate only need Attributes */
        ut.clearAttributes.call(this);

        if(message !== constants.APP.TERMINATE)
        {
            /** Set message to default if empty or undefined */
            message = message || goodbyeSpeech;

            /** Only say quote if skill is not in setup mode */
            switch (currentMode) {
                case constants.STATES.SETUPMODE:
                    this.emit(':tell', message);
                    break;
                default:
                    /** call Quotes API async. */
                    api.getQuotes(function(data){
                        var jsData = ut.processJsonData(data);
                        hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                        if(hasData)
                        {
                            var quote = jsData[constants.API.PROPERTIES.QUOTES.FORISMATIC.QUOTE_TEXT];
                            var author = jsData[constants.API.PROPERTIES.QUOTES.FORISMATIC.QUOTE_AUTHOR];
                            

                            quoteIntro = ut.pickRandomWord(myIntent.t('QUOTES_INTRO', author || "an unknown author"), "");
                            quoteMessage = quote || "" ;
                            goodbyeSpeech = `${message} ${pause} ${quoteIntro} ${longPause} ${quoteMessage}. ${longPause} ${seasonGreetings}`;
                            myIntent.emit(':tell', goodbyeSpeech);
                        }
                        else
                        {
                            message = `${message} ${longPause} ${seasonGreetings}`;
                            myIntent.emit(':tell', message);
                        }
                           
                    });
                    break;
            }
        }
        else{
            this.emit(':saveState', true);
        }
    },

    /** Called ONLY once for new devices, provides info about skill
     * Sample Utterances and direct user to SETUPMODE.
     */
    'Welcome' : function(){
        /** TODO: Implement for application start */
        var pause = constants.BREAKTIME['100'];
        var midPause = constants.BREAKTIME['150'];
        var semiPause = constants.BREAKTIME['250'];
        var longPause = constants.BREAKTIME['350'];
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var fakeStopId = ut.getRandomNumber(1,100);
        var userTimezone = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.TIMEZONE);
        var userCity = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.CITY);
        var userState = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY_STATE);
        var userCountry = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.COUNTRY);
        var userStops = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.STOP_ID);
        var timeOfDay = ut.getUserTimeOfDay(userTimezone);
        var dayOfWeek = ut.getUserDay(userTimezone);
        var homeStopName = ut.getSessionAttribute.call(this, constants.ATTRIBUTES.HOME_STOP_NAME);
        var helpPrompt = ut.pickRandomWord(this.t('GENERAL_PROMPT_RESPONSE'), this.t(constants.DEFAULTS.HELP_PROMPT)); 

        var factIntro = ut.pickRandomWord(this.t('FACTS_INTROS'), this.t('DEFAULT_FACT_INTRO'));
        var greetingSpeech = ut.pickRandomWord(this.t(timeOfDay), this.t('DEFAULT_GREETING'));
        var weatherSpeech = undefined;
        var factSpeech = undefined;
        
        var speechOutput = "";
        var promptSpeech = "";
        var myIntent = this;

        /** API Request and Results variables */
        var jsData = undefined;
        var dataset = undefined;
        var hasData = undefined;
        var weather = undefined;
        var fact = undefined;

        /** Get Current weather conditions */
        api.getWeatherConditions(userCity, userState, function(data){
            jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
            hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

            if(hasData)
            {
                dataset = jsData[constants.API.PROPERTIES.WEATHER.RESULT_SET];
                weather = fmt.formatWeather(dataset);

                var weatherProp = constants.API.PROPERTIES.WEATHER.WEATHER;
                var tempProp = constants.API.PROPERTIES.WEATHER.FAHRENHEIT_TEMP;
                var humidityProp = constants.API.PROPERTIES.WEATHER.HUMIDITY;
                var speedProp = constants.API.PROPERTIES.WEATHER.WIND_MPH;

                /** Extract Tempreture Parts */
                var tempreture = weather[tempProp];
                var weatherDesc = weather[weatherProp];
                var humidity = weather[humidityProp];
                var wind = weather[speedProp];
                var userCity = ut.getSessionAttribute.call(myIntent, constants.ATTRIBUTES.CITY);

                /** Prepare Tempreture speech */
                weatherSpeech = myIntent.t('WEATHER_MESSAGE', userCity || "your city" , weatherDesc, tempreture, humidity, wind);

                /** Get Random Fact */
                api.getRandomFacts(function(data){
                    /** Verifiy if response has valid Data */
                    jsData = ut.hasValidResponse(data) ? JSON.parse(data) : null;
                    hasData = !__.isNull(jsData) && !__.isEmpty(jsData);

                    if(hasData)
                    {
                        fact = fmt.formatRandomFacts(jsData);
                        var numberProp = constants.API.PROPERTIES.FACTS.NUMBER;
                        var textProp = constants.API.PROPERTIES.FACTS.TEXT;

                        var factNumber = fact[numberProp];
                        var factText = fact[textProp];

                        var factSpeech = `${factIntro} ${factNumber}, is ${factText}?`;
                        var message = myIntent.t('START_MESSAGE', homeStopName);

                        speechOutput = `${greetingSpeech} ${semiPause} ${factSpeech} ${semiPause} ${weatherSpeech} ${semiPause} ${message}.`;
                        promptSpeech = myIntent.t('REQUEST_FOR_RESPONSE');

                        /** Preserve last speech for repeach intent */
                        ut.setSessionAttribute.call(myIntent, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.GET_HOME_BRIEFING);
                        ut.keepForRepeat.call(myIntent, speechOutput, promptSpeech);
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                    else
                    {
                        var request = "facts";
                        speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, request);
                        promptSpeech = helpPrompt;
                        myIntent.emit(':ask', speechOutput, promptSpeech);
                    }
                });
            }
            else
            {
                var request = "current conditions";
                speechOutput = myIntent.t('NO_RESPONSE_RESULT_MESSAGE', badExclamation, request);
                promptSpeech = helpPrompt;
                myIntent.emit(':ask', speechOutput, promptSpeech);
            }
        });
    },

    /** Handles all unknown and unhandled Requests */
    'UnhandledSession': function(){
        var speechOutput = this.t('UNHANDLED_SESSION_MESSAGE');
        var promptSpeech = this.t('UNHANDLED_SESSION_MESSAGE') + this.t('REQUEST_FOR_RESPONSE');
        this.emit(':ask', speechOutput, promptSpeech);
    },

    /** Initiates Setup for new Devices */
    'launchSetupMode' : function(){
        this.handler.state = constants.STATES.SETUPMODE;
        var fakeZipCodeSpeech = ut.spellDigitOutput(ut.getRandomZipCode());
        var fakeStopId = ut.getRandomNumber(1,100);
        var fakeCity = ut.getRandomUSCity();
        var fakeState = ut.getRandomUSState();
        var welcomeExclamation = ut.pickRandomWord(this.t('WELCOME_EXCLAMATIONS'), this.t('DEFAULT_WELCOME_EXCLAMATION'));
        var goodExclamation = ut.pickRandomWord(this.t('GOOD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.OK_EXCLAMATION));
        var badExclamation = ut.pickRandomWord(this.t('BAD_RESPONSE_EXCLAMATIONS'), this.t(constants.DEFAULTS.SORRY_EXCLAMATION));
        var skillName = this.t('SKILL_NAME');
        var pause = constants.BREAKTIME['150'];
        var shortPause = constants.BREAKTIME['100'];
        var longPause = constants.BREAKTIME['200'];
        var triesLeft = parseInt(this.attributes[constants.ATTRIBUTES.TRIES_LEFT]);
        var plural = ut.getPlural('attempt', triesLeft);
        var speechOutput = "";
        var promptSpeech = "";
        var fakeSetupObject = `${fakeCity}${shortPause}${fakeState}${shortPause}${fakeStopId}`;

        switch (this.attributes[constants.ATTRIBUTES.CONTEXT]) {
            case constants.CONTEXT.VERIFY_ZIPCODE_NO:
            case constants.CONTEXT.VERIFY_LOCATION:
            case constants.CONTEXT.INVALID_ZIPCODE_RESPONSE:
            case constants.CONTEXT.VERIFY_ZIPCODE:
                /** Tell use number of attempts left, and ask for retry */
                speechOutput = this.t('PROVIDE_NEW_ZIPCODE_MESSAGE', triesLeft, plural);
                promptSpeech = this.t('PROVIDE_NEW_ZIPCODE_PROMPT');

                /** Persisit Response for repeat intent */
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.VERIFY_COUNTRY:
            case constants.CONTEXT.VERIFY_STOP_ID_SETUP:
            case constants.CONTEXT.VERIFY_STOP_DETAILS:
                var msg = this.t('PROVIDE_NEW_STOP_ID_MESSAGE', triesLeft, plural);
                var details = this.t('NO_COUNTRY_FOUND_MESSAGE', fakeSetupObject, fakeSetupObject);

                speechOutput = `${msg}.${shortPause}${details}.`;
                promptSpeech = this.t('REQUEST_FOR_RESPONSE');

                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
            case constants.CONTEXT.NO_STOPS_FOUND:
                /** To Implement */
                this.emit('EndSession', 'This is a common setup error.');
                break;
            default:
                var intro = this.t('SETUP_WELCOME_INTRO', welcomeExclamation, skillName);
                var msg = this.t('SETUP_WELCOME_MESSAGE');
                var details = this.t('SETUP_WELCOME_DETAILS', goodExclamation);
                var instruction_1 = this.t('SETUP_WELCOME_INSTRUCTION_1', fakeCity, pause, fakeState, pause, fakeStopId, fakeCity, pause, fakeState, pause, fakeStopId);
                var instruction_2 = this.t('SETUP_WELCOME_INSTRUCTION_2', fakeZipCodeSpeech, fakeZipCodeSpeech);
                var options = this.t('UTTERANCE_OPTIONS_MESSAGE');
                
                promptSpeech = this.t('REQUEST_FOR_RESPONSE');
                speechOutput = `${intro} ${pause} ${msg} ${longPause} ${details} ${longPause} ${instruction_1} ${longPause} ${instruction_2} ${longPause} ${options}`;

                /** Set session context and persisit speech for repeat intent*/
                ut.setSessionAttribute.call(this, constants.ATTRIBUTES.CONTEXT, constants.CONTEXT.DEVICE_SETUP);
                ut.keepForRepeat.call(this, speechOutput, promptSpeech);
                this.emit(':ask', speechOutput, promptSpeech);
                break;
        }
    }
};