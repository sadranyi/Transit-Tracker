module.exports = {
    "en-US" : {
        "translation": {
            "SKILL_NAME" : "Transit Tracker ",
            /** NEW DEVICE WELCOME MESSAGE */
            "SETUP_WELCOME_INTRO" : "%s, I am %s. I will be assisting you with schedules, arrivals, delays, alerts and detours for transit services in your city.", //[welcomeExclamation, appName]
            "SETUP_WELCOME_MESSAGE" : "To spice things up, I will tell you some famous quotes, random number facts, and current weather forcast.",
            "SETUP_WELCOME_DETAILS" : "%s, let's get you setup. I can configure your device, using, your current zipcode, closest stop, or station ID.", //[goodExclamation]
            "SETUP_WELCOME_INSTRUCTION_1" : "To setup with a closest stop or station ID, say, setup my device with %s, %s, %s, %s, %s. or, configure my device with %s, %s, %s, %s, %s.", //[city, pause, state, pause, stopId]
            "SETUP_WELCOME_INSTRUCTION_2" : "To setup with your current zipcode, say, setup my device with %s, or configure my device with %s", //[zipcode, zipcode]         
            "REQUEST_FOR_RESPONSE" : "How can I help? ",
            "DID_YOU_KNOW" : "Did you know",
            "IS" : "is",
            "SETUP_HELP_INTRO" : "%s, To setup your device with a stop or station ID closest to you, say, setup my device with %s. or, configure my device with %s." , //[helpExclamation, setupObject]
            "SETUP_HELP_MESSAGE" : "To setup your device with your current zipcode, say, setup my device with %s, or, configure my device with %s.", //[zipcode]
            "RESET_HELP_MESSAGE" : "At any point in time, if you want to change your default setup, say reset my device, or, clean up my device.",
            "UTTERANCE_OPTIONS_MESSAGE" : "You can always say, help, Repeat, or, stop, to quit.",
            "DEFAULT_WELCOME_EXCLAMATION" : "Welcome",
            "SETUP_VERIFY_STOP_ID_LIMIT_MESSAGE" : "Sorry, you have reached the maximum setup attempts. Please try again when you have a valid ID. Thank you! ",
            "INVALID_ZIPCODE_RESPONSE_MESSAGE" : "%s, the zipcode you provided is invalid. You have %s more %s. Please say a valid zipcode. ", //[exclamation, numberOfAttemps, attemps pluralization]
            "INVALID_STOP_ID_RESPONSE_MESSAGE" : "%s, the ID you provided is invalid. You have %s more %s. Please provide a valid ID as part of your setup request. ", //[exclamation, number of attemps, attemps pluralization]
            "PROVIDE_NEW_ZIPCODE_PROMPT" : "Please say a valid zipcode. ",
            "PROVIDE_NEW_STOP_ID_PROMPT" : "Please provide a valid ID as part of your setup request.",
            "SETUP_VERIFY_ZIP_MESSAGE" : '%s, I heard %s. if this is correct, say yes to proceed, or say no to provide a new zipcode. ', //[EXclamation, zipcode]
            "SETUP_VERIFY_ZIP_PROMPT" : 'Say yes to confirm %s as your default zipcode, or say no to provide a new one. ', //[zipcode]
            "SETUP_VERIFY_STOP_ID_MESSAGE" : '%s, I heard, %s. if this is correct, say yes to proceed, or say no to provide new setup details. ', //[goodExclamation, SetupObject{city,state,stopID}]
            "SETUP_VERIFY_STOP_ID_PROMPT" : 'Say yes to confirm, %s, as your default stop details, or say no to provide new setup details. ', //[SetupObject{city,state,stopID}]
            "SETUP_VERIFY_LIMIT" : "Sorry, you have reached the maximum setup attempts. Please try again when you have valid required information. Thank you! ",
            "NO_GEOCODE_FOUND_MESSAGE" : "%s, I am unable to find a valid geocode for your zipcode %s. Try setting up your device with a new zipcode. ", //[Exclamation, zipcode] 
            "NO_GEOCODE_FOUND_PROMPT" : "You can say, setup my device with %s, or configure my device with %s. ", //[fakezipcode, fakezipcode] 
            "NO_COUNTRY_FOUND_MESSAGE" : "%s, I am unable to find a valid country for %s. Try setting up your device with a new stop detail. ", //[Exclamation, object(city,state)] 
            "NO_COUNTRY_FOUND_MESSAGE" : "You can say, setup my device with, %s, or configure my device with, %s, ", //[fakeObject{cit, state, stopID}] 
            "STOP_FOUND_INTRO" : "%s, I found %s %s. I will provide you details based on the most closest to you in miles. ", //[Exclamation, stopCount, pluralization]
            "STOP_FOUND_MESSAGE" : "If you want to use any as your prefered %s, say yes after I have provided details and prompted you. ", //[{stop/station}]
            "COUNTRY_FOUND_MESSAGE" : "%s, I found %s, %s, in %s. If this is correct, say yes to confirm, or say, no, to try again", //[Exclamation, country]
            "COUNTRY_NOT_SERVICED_INTRO" : "%s, I don't have providers in %s as of now. ", //[exclamation, country]
            "COUNTRY_NOT_SERVICED_MESSAGE" : "I currently have providers in %s. I will be adding more providers in due time. ", //[country list]
            "COUNTRY_NOT_SERVICED_DETAILS" : "You can setup your device with a new zipcode, stop, or, station ID details. You can also say, help, for assistance, or, say, stop to quit. ",
            "COUNTRY_NOT_SERVICED_PROMPT" : "You can say, help for assistance, or, say, stop, to quite. ",
            "STATE_NOT_SERVICED_INTRO" : "%s, I don't have providers in %s as of now. ", //[exclamation, state]
            "STATE_NOT_SERVICED_MESSAGE" : "I currently have providers in %s. I will be adding more providers in due time. ", //[state list]
            "SETUP_DEVICE_PROMPT" : "You can try again with new details. You can say, help, for assistance, or, say, stop to quit.", //[fakezipcode, fakezipcode]
            "FOUND_STOP_STATION_DETAILS_MESSAGE" : "%s, I found your %s, %s, operated by, %s. If this is correct say, Yes to confirm, or say, no to provide new setup details. ", //[goodExclamation, {Stop|Station}, {stopName|stationName}, serviceProviderName]
            "FOUND_STOP_STATION_DETAILS_PROMPT" : "Provide a new setup information to continue. You can also say, Help, for assistance, or, say, stop to quit. ",
            "STOP_VERIFIED_INTRO" : "%s, %s has been set as your default prefered %s.", //[exclamation, stopName, {stop|station}]
            "STOP_VERIFIED_MESSAGE" : "I can now assist you with transit information. You can say, start, open, or, launch %s.", 
            "UNKNOWN_REQUEST_MESSAGE" : "%s, I did not understand your request. ", //[Exclamation]
            "UNKNOWN_REQUEST_PROMPT" : "You can say, help, or say, stop to quit. ",
            "UNHANDLED_SESSION_MESSAGE" : "Sorry, I didn\t understand that, you can say, help or Stop to quit. ",
            "LAUNCH_SETUP_MESSAGE" : "Welcome to %s. %s, It appears your device has not been setup. I can walk you through the setup process. ", //[skillName, EXclamation]
            "LAUNCH_SETUP_DETAILS_1" : "I will need the zipcode of your current location to proceed. ",
            "LAUNCH_SETUP_DETAILS_2" : "This will enable me to infer your transit provider, city, closest stops, routes and buses. ",
            "LAUNCH_SETUP_DETAILS_3" : "If you are ready with your zipcode, you can say, setup my device with %s, or configure my device with %s. ", //[zipcode]
            "LAUNCH_SETUP_DETAILS_4" : "You can also say help, stop, or cancel to quit. ",
            "LAUNCH_SETUP_PROMPT" : "You can also say, use %s as my zipcode, or configure %s as my zipcode. You can also say stop, or cancel to quit. ", //[zipcode]
            "PROVIDE_NEW_ZIPCODE_MESSAGE" : "Let's try again, you have %s more %s. Please say a valid zipcode. ", //[limits, attempts pluralization]
            "CONTEXT_VERIFY_ZIPCODE_HELP_MESSAGE" : "%s, verifying your zipcode helps me infer accurately, your service provider, stops, routes and buses. if %s is correct, say yes, or say no to provide a new zipcode", //[Exclamation, zipcode]
            "CONTEXT_VERIFY_ZIPCODE_HELP_PROMPT" : "Say yes to confirm %s as your valid zipcode, or say no to provide a new zipcode. ", //[zipcode]
            "PROVIDE_NEW_STOP_ID_MESSAGE" : "Let's try again, you have %s more %s. Please provide new setup details. ", //[limits, attempts pluralization]
            "WELCOME_EXCLAMATIONS" : ["Hello", "Hi", "Welcome", "Greetings", "Howdy", "Aloha", "What's up"],
            "GOOD_RESPONSE_EXCLAMATIONS" : ["Ok", "Great", "Awesome", "Good call", "Alright", "Amazing", "Brilliant", "Fantastic", "Perfect", "Splendid", "Fabulous"],
            "BAD_RESPONSE_EXCLAMATIONS" : ["Oops", "Sorry", "Ouch", "Hmm", "Unfortunately"],
            "HELP_RESPONSE_EXCLAMATIONS" : ["Ok", "Sure", "My pleasure", "Rightaway", "You got it", "No worries", "I’m happy to help", "Anytime", "glad to help"],
            "GENERAL_PROMPT_RESPONSE" : ["How can I help?", "how can I assist?", "What can I help you with?", "What would it be?"],
            "UNKNOWN_CONTEXT_MESSAGE" : "%s, there seems to be a problem. Let's try again. You can say restart, start over, or start again. ", //[exclamation]
            "NAVIGATION_HELP_MESSAGE" : "You can say, Next, Skip, or, Skip Forward to advance through provided stops.",
            "NAVIGATION_HELP_DETAILS" : "You can also say, go back, skip back, or back up, to navigate backwards.",
            "NAVIGATION_HELP_PROPMT" : "At any point during our interaction, you can say, stop to quit.",
            "DEFAULT_GOODBYE_MESSAGE" : "Goodbye!",
            "DEFAULT_HELP_MESSAGE" : "How can I help",
            "DEFAULT_OK_EXCLAMATION" : "Ok",
            "DEFAULT_SORRY_EXCLAMATION" : "Sorry",
            "ADDRESS_FOUND_INTRO" : "%s, I found your zipcode %s in %s, %s, %s. ", //[exclamation, zipcode, city, state, country]
            "ADDRESS_FOUND_DETAILS" : "If this is correct, say yes to proceed, or say no, to try again. ",
            "VERIFY_YES_OR_NO" : "Say yes to confirm, or no to try again. ",
            "USE_AS_DEFAULT_STOP_MESSAGE" : "Do you want to use, %s, as your default %s? ", //[stopName, {stop|station}]
            "USE_AS_DEFAULT_STOP_PROMPT" : "You can say yes, to confirm. You can also say Next, or Skip to get another %s. ", //[{stop|station}]
            "STOP_NOT_FOUND_INTRO" : "%s, am unable to find stops near you. Please setup your device with a new zipcode. ", //[exclamation]
            "STOP_NOT_FOUND_MESSAGE" : "You can also say, help, or say no to quit. ",
            "SETUP_ZIPCODE_PROMPT" : "You can say, setup my device with %s, or configure my device with %s. You can also say stop to quit. ", //[fakezipcode, fakezipcode]
            "LAST_STOP_INDEX_MESSAGE" : "%s was the last stop. You can say, repeat, for details, or say, go back, skip back, or back up.", //[stopName]
            "FIRST_STOP_INDEX_MESSAGE" : "%s is the first stop. You can say, repeat, for details, or say, skip, or next.", //[stopName]

            /** STARTMODE */
            "STARTMODE_GENERAL_HELP_MESSAGE_1" : "%s, for transit information at your prefered stop, you can say things like, Tell me, Give me, followed by Arrivals, Alerts, Delays, Detours, or, Schedules at my stop", //[helpExclamation]
            "STARTMODE_GENERAL_HELP_MESSAGE_2" : "For example, you can say, Tell me my arrivals, or, Give me delays at my stop",
            "STARTMODE_GENERAL_HELP_MESSAGE_3" : "You can ask for transit briefing by saying, Give me my brief, or say, tell me my brief. Saying brief me, or, give me a summary, works Perfectly fine.",
            "STARTMODE_GENERAL_HELP_MESSAGE_4" : "You may also say, Where is my ride, When is my ride, get me a ride, or, check on my ride.",
            "STARTMODE_GENERAL_HELP_MESSAGE_5" : "For Transit information at other stops you can say, give me arrivals for %s, or, tell me delays at %s", //[fakeStopId, fakeStopId]
            "STARTMODE_GENERAL_HELP_MESSAGE_6" : "At any point during our interaction, you can say, Repeat, Help, or, Stop to quit",
            "WEATHER_MESSAGE" : "currently, in %s, the weather is, %s, with tempretures of, %s, degrees fahrenheit. Relative humidity of, %s, with wind speeds at, %s miles per hour.", //[city, weather, tempareture, humidity, wind speed]
            "START_MESSAGE" : "Do you want transit briefing for, %s? You can say yes, or say no, to ask for something else.", //[homeStopName] 
            "RESET_MESSAGE" : "%s, You will need to reconfigure your device for better transit information assistance.",
            "SERVICE_PROVIDER_NOT_SUPPORTED" : "%s, the service provider is not supported. Please try again later.",
            "AVAILABLE_OPTIONS" : "You can say help, for asistance, or say stop, to quit.",
            "GET_ANOTHER_BRIEF" : "Do you want Briefing for another stop?.", 
            "GET_ANOTHER_MESSAGE" : "Do you want to get another %s? you can say yes, or say no, to quit.", //[type(arrivals, delays, schedules etc)]
            "ASK_OR_EXIT" : "You can ask for other transit information, or say, stop, to quit.",
            "HOME_ARRIVAL_HELP_MESSAGE" : "To get arrivals for %s, which is your prefered stop, say, give me my arrivals, or, tell me arrivals.", //[stopName]
            "GET_ALERTS_HELP_MESSAGE_1" : "To get alerts for %s, say, give me alerts, or, tell me my alerts. For any other stop, you can say tell me alerts for %s", //[stopName, fakeStop]
            "GET_ALERTS_HELP_MESSAGE_2" : "You may also say, give me alerts at my stop.",
            "GET_SCHEDULES_HELP_MESSAGE_1" : "To get schedules for %s, say, give me my schedules, or, simple say schedules.", //[StopnName]
            "GET_SCHEDULES_HELPMESSAGE_2" : "For other stops, say, tell me schedules for %s, or give me schedules for %s.", //[fakeStopId]
            "GET_SUMMARY_HELP_MESSAGE_1" : "To get transit summary, briefing, or flash at %s, say, give me my briefing, or, say, what's my transit briefing.", //[stopName]
            "GET_SUMMARY_HELP_MESSAGE_2" : "For other stops, routes, or buses, say, give me briefing for %s", //[fakeId]
            "API_NOT_SUPPORTED_MESSAGE" : "%s, %s, does not provide API support for %s", //[badexclamation, serviceProvider, APIType]
            "GET_DELAYS_HELP_MESSAGE_1" : "To get delays for %s, say, give me delays, or, say, what's my delay.", //[stopName]
            "GET_DELAYS_HELP_MESSAGE_2" : "For other stops, routes or buses, say, give me delays for %s", //[fakeId]
            "GET_DETOURES_HELP_MESSAGE_1" : "To get detoures for %s, say, give me detoures, or, say, what's my detour.", //[stopName]
            "GET_DETOURES_HELP_MESSAGE_2" : "For other stops, routes or buses, say, give me detoures for %s", //[fakeId]
            "INVALID_REQUESTED_ID_MESSAGE" : "%s, the ID you provided is not valid. Please try again with a new ID", //[badexclamation]
            "VERIFY_REQUESTED_ID_MESSAGE" : "%s, I heard, %s, if this is correct, say yes, else, say no, to try again.", //[goodExclamation, idSpeech]
            "NO_RESPONSE_RESULT_MESSAGE" : "%s, There are no %s at the moment. You can ask for asistance, or say, stop, to quit.", //[badexclamation, PluralizeRequestTypes]
            "LAST_ITEM_INDEX_MESSAGE" : "%s was the last %s. You can say, repeat for details, or say go back, skip back, or back up.", //[ItemName, ItemType]
            "FIRST_ITEM_INDEX_MESSAGE" : "%s is the first %s. You can say, repeat for details, or say skip, or next.", //[ItemName, ItemType]
            "STOPS_NOT_SUPPORTED_BY_PROVIDER" : "%s, %s, does not provide services for Buses. Please try another provider.", //[badexclamation, providerName]
            "STATIONS_NOT_SUPPORTED_BY_PROVIDER" : "%s, %s, does not provide services for trains. Please try another transit agency.", //[badexclamation, providerName]
            "PROVIDERS_COMING_SOON" : "%s, Your service provider is not supported at this time. Please try again later.", //[badexclamation]
            "NO_STOP_FOUND_MESSAGE" : "%s, I am unable to find stops at your current location at the moment. Please try again later", //[badexclamation]
            "USE_AS_DEFAULT_AGENCY_MESSAGE" : "Do you want to use, %s, as your default transit provider? ", //[AgencyName]
            "USE_AS_DEFAULT_AGENCY_PROMPT" : "You can say, yes, to confirm. You can also say, Next, or, Skip to get another Transit Provider.",
            "AGENCY_FOUND_INTRO" : "%s, I found %s, transit %s. I will provide you details based on the most closest to you in miles. ", //[Exclamation, count, pluralization]
            "AGENCY_FOUND_MESSAGE" : "If you want to use any as your prefered transit service provider, say yes after I have provided details, and prompted you. ",
            "LAST_ITEM_INDEX_MESSAGE" : "%s was the last %s. You can say, repeat, for details, or say, go back, skip back, or back up.", //[itemName, itemType]
            "FIRST_ITEM_INDEX_MESSAGE" : "%s is the first %s. You can say, repeat, for details, or say, skip, or next.", //[ItemName, ItemType]
            "NO_SERVICE_PROVIDERS" : "%s, I can't find any Transit Agencies in your area. Please try again later.", //[badexclamation]
            "DO_SOMETHING_ELSE" : "Can I assist you with something else?",
            "ADJECTIVES" : {
                "HOLIDAYS" : [],
                "POSITIVE" : [],
                "NEGATIVE" : []
            },
            PHRASES : {
                "FACTS_INTRO" : [],
                "GOOD_BYE" : [],
                "THANK_YOU" : [],
                "GREETINGS" : {
                    "MORNING" : ["Good Morning", "Awesome Mornig", "Top of the Morning"],
                    "AFTERNOON" : ["Good afternoon", "Nice afternoon", "Happy afternoon"],
                    "EVENING" : ["Good Evening", "Calm Evening", "Evening"],
                    "NIGHT" : ["Good night", "Sweet dreams"],
                    "DEFAULT" : ["Hello!", "Good Day!", "Greetings!"]
                },
                "HELP" : [],
                "QUOTES_INTRO" : [],
                "SUCCESS" : [],
                "FAILURE" : [],
            },

            /** GREETINGS */
            "MORNING" : ["Good Morning", "Awesome Mornig", "Top of the Morning"],
            "AFTERNOON" : ["Good afternoon", "Nice afternoon", "Happy afternoon"],
            "EVENING" : ["Good Evening", "Calm Evening", "Evening"],
            "NIGHT" : ["Good night", "Sweet dreams"],
            "DEFAULT_GREETING" : "Hello!",
            "QUOTES_INTRO" : [
                "Here's a quote from, %s.",
                "Take this %s quote with you.",
                "Your day will not be complete, without a quote from, %s.",
                "This is what %s, has to say.",
                "Let me leave you with words by, %s.",
                "How about a quote from, %s, for your ride.",
                "How about something to chew on, from, %s.",
                "Some words of wisdom, from, %s.",
                "I leave you with wise sayings, from, %s.",
                "According to %s, ",
                "%s, writes, "
            ],
            "FACTS_INTROS" : [
                "Did you know, ",
                "I bet you didn't know, ",
                "Did you realize that, "
            ],
            "DEFAULT_FACT_INTRO" : "DId you know, ",

            /** Holidays */
            "NEW_YEAR" : [
                "happy and safe New Year", 
                "Happy New Year", 
                "have a safe, healthy, and happy new year!",
                "Joyous new beginnings,happy new year!",
                "Let us drink to the future, happy new year!",
                "Make a New Years resolution, happy new year!",
                "Make a New Years wish, happy new year!",
                "May the best of this year be the worst of next, happy new year!",
                "May the dawning of this new year fill your heart with hope, happiness, love, happy new year!",
                "Wishing you joy in the upcoming year, happy new year!",
                "The promise of a brighter tomorrow, happy new year!",
                "The new year has arrived, happy new year!",
                "The chance at a fresh start, happy new year!",
                "In the company of family and friends, happy new year!",
                "Here's to new beginnings, happy new year!",
                "Let every new year find you a better person, happy new year"
            ],
            "INAUGURATION" : [
                "Happy Inauguration Day"
            ],
            "MARTIN_LUTHER_KING" : [
                "Today we celebrate Martin Luther King jnr's life", 
                "Happy Martin Luther King jnr day"
            ],
            "GEORGE_WASHINGTON" : [
                "Today we celebrate George Washington's life", 
                "Happy George Washington day"
            ],
            "MEMORIAL" : [
                "Happy Memorial Day",
                "My Country, 'Tis of Thee",
                "Never forget, ever honor, Happy Memorial Day",
                "One nation under God, Happy Memorial Day",
                "Remember the fallen, Happy Memorial Day",
                "My patriotic heart beats red, white, and blue, Happy Memorial Day",
                "Lost in the line of duty, Happy Memorial Day",
                "Let us salute our fallen soldiers, Happy Memorial Day",
                "The blessing of freedom, Happy Memorial Day",
                "In their remembrance, Happy Memorial Day",
                "In their honor, Happy Memorial Day",
                "In the name of freedom, Happy Memorial Day",
                "Those who die for country always remains alive in the heart of people, Happy Memorial Day",
                "God bless America, Happy Memorial Day",
                "Honor our fallen soldiers, Happy Memorial Day"
            ],
            "INDEPENDENCE" : [
                "Happy Independence Day", 
                "God bless America", 
                "Happy Birthday, America!", 
                "Happy Fourth of July!", 
                "in reverence to our forefathers, happy Independence day",
                "hail the stars and stripes forever, happy Independence day",
                "I am proud to be an American, happy Independence day",
                "we live in the land of the brave, happy Independence day",
                "Happy independence day Uncle Sam",
                "may the closeness of friends, the comfort of home, and the unity of our nation renew your spirits this day. happy Independence day"
            ],
            "LABOR" : [
                "Happy Labor Day",
                "Thanks for all of the hard work, Happy Labor Day",
                "You are appreciated, Happy Labor Day",
                "You are excellent in everything that you do, Happy Labor Day",
                "Outstanding performance, Happy Labor Day",
                "Thanks for your efforts, Happy Labor Day",
                "Thanks for putting up with me, Happy Labor Day",
                "Thanks for your help, Happy Labor Day",
                "Way to go!, Happy Labor Day"
            ],
            "COLUMBUS" : [
                "Happy Columbus Day"
            ],
            "VETERANS" : [
                "Happy Veterans Day",
                "My Country, 'Tis of Thee, Happy Veterans Day",
                "Never forget, ever honor, Happy Veterans Day",
                "One nation under God, Happy Veterans Day",
                "Remember the fallen, Happy Veterans Day",
                "My patriotic heart beats red, white, and blue, Happy Veterans Day",
                "Lost in the line of duty, Happy Veterans Day",
                "Let us salute our fallen soldiers, Happy Veterans Day",
                "The blessing of freedom, Happy Veterans Day",
                "In their remembrance, Happy Veterans Day",
                "In their honor, Happy Veterans Day",
                "In the name of freedom, Happy Veterans Day",
                "Those who die for country always remains alive in the heart of people, Happy Veterans Day",
                "God bless America, Happy Veterans Day",
                "Honor our fallen soldiers, Happy Veterans Day"
            ],
            "THANKS_GIVING" : [
                "Celebrating life's harvest, happy thanksgiving",
                "Happy thanksgiving",
                "Count your blessings, happy thanksgiving",
                "Eat ‘till you drop, for tomorrow we shop!, happy thanksgiving",
                "Donate to the needy, happy thanksgiving",
                "Celebrate harvest and heritage, happy thanksgiving",
                "A time for sharing and being happy, happy thanksgiving",
                "May the bounty of the season fill your heart and your home, happy thanksgiving",
                "May the blessings of life are upon you, happy thanksgiving",
                "So much to be thankful for, happy thanksgiving",
                "Happy Thanksgiving",
                "Have a Happy Turkey Day!"
            ],
            "CHRISTMAS" : [
                "Mary Christmas",
                "wishing you the best of the season, mary christmas",
                "Be jolly by golly, mary christmas",
                "Beaming with good will and cheerfulness, mary christmas",
                "Best Christmas ever, mary christmas",
                "Celebrate the season, mary christmas",
                "May the glow of Christmas candles warm your day, mary christmas",
                "May peace, love, and prosperity follow you all through the year, mary christmas",
                "May the blessings of Christmas be with you today and always, mary christmas",
                "May the closeness of friends, the comfort of home, and the unity of our nation renew your spirits this holiday season. Mary christmas",
                "May the holiday season bring only happiness and joy to you and your loved ones, mary christmas",
                "May your holidays and new year be filled with joy, mary christmas",
                "Merry Christmas and all the best in the new year"
            ],
            "PRESIDENTS" : [
                "Happy Presidents Day"
            ],
            "EMANCIPATION" : [
                "Happy Emancipation Day",
                "Let's celebrate the day that gave us the freedom of thought, actions, faith and speech!, Happy Emancipation Day",
                "Freedom, Liberty, Unity. Enjoy your Day of Freedom!, Happy Emancipation Day",
                "We celebrate bravery of our fathers and their gift of freedom, Happy Emancipation Day"
            ],
            "MOTHERS" : [
                "Happy Mother's day",
                "I'm still your little girl, happy Mother's day",
                "knowing that you are there for me through the good and the bad, happy Mother's day",
                "You are my favorite hero, happy Mother's day",
                "I just wanted to say I love you, Mom!, happy Mother's day",
                "Thanks for the terrific genes!, happy Mother's day",
                "The bond between daughter and mother, happy Mother's day",
                "You've given me so much, happy Mother's day",
                "You gave me the most precious gift: your time, happy Mother's day",
                "You are the constant love in my life, happy Mother's day",
                "You are my hero, guide, coach, and friend, happy Mother's day",
                "You are and have always been my rock, happy Mother's day",
                "I am honored to be your daughter, happy Mother's day"
            ],
            "FATHERS" : [
                "I'm blessed to have a father like you, happy father's day",
                "Happy father's day",
                "I'm still your little girl, happy father's day",
                "knowing that you are there for me through the good and the bad, happy father's day",
                "You are my favorite hero, happy father's day",
                "I just wanted to say I love you, Dad!, happy father's day",
                "Thanks for the terrific genes!, happy father's day",
                "The bond between daughter and father, happy father's day",
                "You've given me so much, happy father's day",
                "You gave me the most precious gift: your time, happy father's day",
                "You are the constant love in my life, happy father's day",
                "You are my hero, guide, coach, and friend, happy father's day",
                "You are and have always been my rock, happy father's day",
                "I am honored to be your daughter, happy father's day"
            ],
            "HALLOWEEN" : [
                "Happy Halloween!",
                "Have a boo-tiful day, Happy Halloween!",
                "Have a safe and happy Halloween!",
                "I will speak when spooken to, Happy Halloween!",
                "Eat, drink, and be scary, Happy Halloween!",
                "Enter at your own risk, Happy Halloween!",
                "You've cast a spell on me!, Happy Halloween!",
                "Trick or treat, smell my feet, give me something good to eat, Happy Halloween!",
                "I'm too cute to be scary, Happy Halloween!"
            ],
            "DEFAULT_HOLIDAY_MESSAGE" : "Happy %s day", //[HolidayName]
            "NO_SERVICE_ADVISORIES_MESSAGE" : "There are no service advisories at the moment.",
            "REQUEST_UTTERANCES_MESSAGE" : "You can say, give me my Alerts, Delays, Detours, Arrivals, or, Schedules, for more details.",
            "REQUEST_UTTERANCES_HELP" : "You can also say, Help, for assistance, or say, stop, to quit.",
            "NAVIGATE_ITEMS_MESSAGE" : "say next, or skip to hear another %s", //[itemName]
            
            "TEST_MESSAGE" : "Welcome $t(SKILL_NAME) I am in love with this",
        }
    },
    "en-GB" : {
        "translation": {
        }
    },
    "de-DE" : {
        "translation": {

        }
    }
}