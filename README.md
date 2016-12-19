# Transit-Tracker
Transit Tracker Skill, published for the Amazon Alexa API Mashup Contest

### Features
1. Easy Setup process with either zip code or combination or city, state and stop or station ID.
2. Provides Transit Briefing, Arrivals, Alerts, Schedules and Detours
3. Informs you of Scheduled times, estimated times and status (Late, Early, On time, Due)
4. Can provide briefing for frequently requested stops, routes and Buses.
5. Intuitive and contextual help and response.
6. Provides Current Weather conditions in Stop city
7. Gives Random Famous Quotes
8. Gives Random Number Facts
9. Ability to reset Device
10. Seasonal Greetings

### Supported States & Transit Agencies
1.  __OREGON__
    * __Tri-County Metropolitan Transportation District of Oregon (TriMet)__
2.  __NEW YORK__
    * __Metropolitan Transportation Authority (MTA)__
3.  __CALIFORNIA__
    * __Bay Area Rapid Transit (BART)__
4.  __WASHINGTON__
    * __Sound Transit__
    * __Seattle Children's Hospital Shuttle__
    * __Pierce Transit__
    * __Everett Transit__
    * __Metro Transit__
    * __Washington State Ferries__
    * __King county Marine Divison__
    * __Intercity Transit__
    * __City of Seattle__
    * __GO Transit__
    * __Community Transit__


### Sample Setup Utterances (Alexa, ask Transit Tracker to...)
#### New York City, New York, CTA
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with New York City New York Two zero zero eight eight four
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with one zero three zero one

#### Oakland, California, BART
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with Oakland California Twelfth street Oakland City Center
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with nine four six one two

#### Beaverton, Oregon, TriMet
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with Beaverton Oregon five six one eight
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with nine seven zero seven eight (zipcode)

#### Seattle, Washington, Metro Transit
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with Seattle Washington seven five five zero zero
* __[Setup | Configure]__ my __[device | Echo | Tap | Echo Dot]__ with nine eight one one two (zip code)

#### Re-set Decive
* __[clean up | remove | reset]__ my __[device | Echo | Tap | Echo Dot]__

### APIs Used
* [GOOGLE MAPS APIs](https://developers.google.com/maps/)
* [BART](http://api.bart.gov/docs/overview/index.aspx)
* [One Bus Away](https://github.com/OneBusAway/onebusaway/wiki)
* [MTA](http://datamine.mta.info/)
* [TRIMET](http://developer.trimet.org/ws_docs/)
* [RANDOM QUOTES](http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en)
* [WEATHER UNDERGROUND](http://api.wunderground.com/api/)
* [NUMBER FACTS](numbersapi.p.mashape.com)
* [ZIPCOES API](https://www.zipcodeapi.com/rest/)

### Helpful Tools and Links
#### [Utterances Generator](http://www.makermusings.com/amazon-echo-utterance-expander/) 
#### Example:
* IntentName (setup /configure /initialize /prepare /set) my (device /echo /tap /echo dot) with {zipcode}
* IntentName (setup /configure /initialize /set /use) {zipcode} as my zip code

#### [Regular Expression Tools](http://regexr.com/)
#### [Moment.js Holiday Plugin](https://gist.github.com/jrhames/5200024)
#### [Words to Use](http://www.words-to-use.com/)
#### [Clyp](https://clyp.it/api)

### Libraries & Packages
* alexa-sdk
* array-to-sentence
* bluebird
* chance
* dynamite
* faker
* geodist
* grammarray
* json-query
* lodash
* moment
* moment-timezone
* pluralize
* random-words
* tensify
* underscore
* xml2js

### V 2.0
* Move all RESOURCES into Persistent Database (DYNAMODB | MYSQL | Mongo)
* Make most options configurable.
  * Allow user to change zip code, city, country, state by utterance for SetingsIntent
* Add info_links from Transit providers into Cards for Alexa App
* Add Ability for user to request specified number of [Arrivals|Schedules]
* Add Trip Planning Abilities [Send Results to Maps for display on Card]
* Allow user to choose category of Facts and Quotes.
* Modify Facts to include other categories.
* Add UK and Germany Transit Service Providers 
* Ability to get Alerts, Schedules, Arrivals and detours for last requested stops, buses and routes
* Support Multiple Transit Agencies in each state.
* Implement Audio Quotes, Facts and Speeches