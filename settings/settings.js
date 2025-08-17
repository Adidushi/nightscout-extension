// Compatibility wrapper for Chrome/Firefox APIs
const extAPI = (typeof browser !== 'undefined') ? browser : chrome;

var onPressButton

document.getElementById("backButton").onclick = function() {
    console.log("Going Back");
    document.getElementById("backButton").blur();
    window.location.href = "/../popup.html";
    extAPI.browserAction.setPopup({
        popup: "/../popup.html"
    });
}

function mgdlToMMOL(mgdlVal) {
    var mmolMult = 18.016;
    var tempMmol = mgdlVal / mmolMult;
    //make sure to round to one decimal place!
    var tempMmolFinal = Math.round(tempMmol * 10) / 10;
    if (tempMmolFinal % 1 == 0) {
        tempMmolFinal = tempMmolFinal + ".0";
    }
    return (tempMmolFinal);
}

function mmoltoMGDL(mmolVal) {
    var mmolMult = 18.016;
    var tempMGDL = mmolVal * mmolMult;
    //make sure to round to one decimal place!
    var tempMgdlFinal = Math.round(tempMGDL);
    return (tempMgdlFinal);
}

// Promisified wrappers for extAPI.storage.local.get/set
function getStorage(key) {
  return new Promise((resolve, reject) => {
    extAPI.storage.local.get(key, result => {
      if (extAPI.runtime.lastError) reject(extAPI.runtime.lastError);
      else resolve(result);
    });
  });
}
function setStorage(obj) {
  return new Promise((resolve, reject) => {
    extAPI.storage.local.set(obj, () => {
      if (extAPI.runtime.lastError) reject(extAPI.runtime.lastError);
      else resolve();
    });
  });
}

async function checkBSvariables() {
  if(document){
    try {
      const result = await getStorage(['alarmValues']);
      const alarmSnoozeVal = await getStorage(['snoozeMinutes']);
      const unitResult = await getStorage(['unitValue']);
      const colorResult = await getStorage(['colors']);
      const unitType = Object.values(unitResult)[0];
      const alarmValues = Object.values(result);
      const colorValues = Object.values(colorResult)[0];
      if (alarmValues) {
        var urgentLowData = alarmValues[0][0];
        var lowData = alarmValues[0][1];
        var highData = alarmValues[0][2];
        var urgentHighData = alarmValues[0][3];
        //check if mmol
        if (unitType == "mmol") {
          urgentLowData[0] = mgdlToMMOL(urgentLowData[0]);
          lowData[0] = mgdlToMMOL(lowData[0]);
          highData[0] = mgdlToMMOL(highData[0]);
          urgentHighData[0] = mgdlToMMOL(urgentHighData[0]);
        }
        var snoozeData = Number(Object.values(alarmSnoozeVal)[0]);
        //check if any are changed.
        document.getElementById("urgentLowAlertValue").value = urgentLowData[0];
        document.getElementById("urgentLowAlertValue").placeholder = urgentLowData[0];

        document.getElementById("lowAlertValue").value = lowData[0];
        document.getElementById("lowAlertValue").placeholder = lowData[0];

        document.getElementById("highAlertValue").value = highData[0];
        document.getElementById("highAlertValue").placeholder = highData[0];

        document.getElementById("urgentHighAlertValue").value = urgentHighData[0];
        document.getElementById("urgentHighAlertValue").placeholder = urgentHighData[0];

        document.getElementById("urgentLowEnabled").checked = urgentLowData[1];
        document.getElementById("lowEnabled").checked = lowData[1];
        document.getElementById("highEnabled").checked = highData[1];
        document.getElementById("urgentHighEnabled").checked = urgentHighData[1];
        console.log("SNOOZE DATA IS " + snoozeData);
        if (isNaN(snoozeData)) {
          //support for old users who don't have data.
          snoozeData = 30;
        }
        document.getElementById("alarmSnoozeLength").value = snoozeData;
        document.getElementById("alarmSnoozeLength").placeholder = snoozeData;
        //set color box value.
        if(colorValues == "colors"){
          document.getElementById("themeBox").options[1].selected = 'selected';
        }else{
          document.getElementById("themeBox").options[0].selected = 'selected';
        }
        //now, set site url in the same function.
        const siteResult = await getStorage(['siteUrl']);
        const siteUrlValue = Object.values(siteResult);
        if (siteUrlValue != "") {
          document.getElementById("siteURL").value = siteUrlValue;
          document.getElementById("siteURL").placeholder = siteUrlValue;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

function getValueText(stringName, unitType) {
    //sanitize user input so they aren't mean
    var getString = document.getElementById(stringName).value;
    if (isNaN(getString)) {
        //NOT A number! return false;
        return false;
    } else {
        //we good boys
        if (Number(getString) <= 0) {
            //below 0.
            return false;
        } else {
            if (unitType) {
                if (unitType == "mmol") {
                    //it's mmol, do conversion stuff!
                    console.log("mmol is " + Number(getString));
                    getString = mmoltoMGDL(Number(getString));
                    console.log("mgdl is " + Number(getString));
                }
            }
            //give plain number.
            return Number(getString);
        }
    }
}
function stringManipBoth(urlString){
	var urlStringBase = urlString;
	var httpsVal;

	if (urlStringBase.endsWith("/")) {
        //we're fine. we have a slash.
    } else {
        //no slash, add one.
        urlStringBase = urlStringBase + "/";
    }

    if (urlStringBase.startsWith("https://") ) {
        //it starts with https
        httpsVal = urlStringBase;
    } else if(urlStringBase.startsWith("http://")){
    	//starts with http.
        httpsVal = "https"+urlStringBase.slice(4);
    } else {
        //no http, add to string.
        httpsVal = "https://" + urlStringBase;
    }
	return [httpsVal,httpsVal];
}

function possibleUrlValues(callbackFunction){
	var urlString = document.getElementById("siteURL").value;
	var stringSplit = urlString.split(".");
	var isHeroku = false;
	for(i=0;i<stringSplit.length;i++){
		if(stringSplit[i] == "herokuapp"){
			//console.log("it's heroku.")
			isHeroku = true;
		}
	}
	if(isHeroku == true){
		//just return
		if(callbackFunction){
			callbackFunction([],true);
			return;
		}
	}else{
		//now that it's NOT heroku, we can manipulate the string and ask for perms.
		var valuesArray = stringManipBoth(urlString);
		if(callbackFunction){
			callbackFunction(valuesArray,false);
		}
	}
}

function getURLText(callbackFunction) {
    //sanitize user input so they aren't mean
    var urlString = document.getElementById("siteURL").value;
    //now you have string, check if it's valid.
    //check if it starts with https/http and manipulate accordingly
    if (urlString.startsWith("https://")) {
        //it starts with https/http, we should be good.
    } else if(urlString.startsWith("http://")){
        urlString = urlString.replace("http://", "https://") ;
    } else {
        //no http, add to string.
        urlString = "https://" + urlString;
    }
    //make sure it ends in a big ol slash
    if (urlString.endsWith("/")) {
        //we're fine. we have a slash.
    } else {
        //no slash, add one.
        urlString = urlString + "/";
    }
    //v this should not be needed, simply testing for web api response.
    //urlString = urlString+ 'api/v1/entries.json?count=';
    console.log("URL IS " + urlString);
    //check if site exists
    var xhr = new XMLHttpRequest();
    xhr.open("GET", urlString, true);
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                //console.log(xhr.responseText);
                callbackFunction(urlString);
            } else {
                callbackFunction(false);
            }
        } else {
            callbackFunction(false);
        }
    };
    xhr.onerror = function(e) {
        //console.error(xhr.statusText);
        callbackFunction(false);
    };
    xhr.send(null);

}

function getCheckValue(stringName) {
    var getCheck = document.getElementById(stringName).checked;
    return getCheck;
}
function getListValue(stringName){
	var gottenId = document.getElementById(stringName).value;
	if(Number(gottenId) == 1){
		//colors
		return "colors";
	}else if(Number(gottenId) == 0){
		//default
		return "default"
	}else{return "default";}
}
function alertFunc(customMessage) {    
    alert(customMessage);
}

function reloadBackgroundAndSettings() {
    // In Firefox, we can't call getBackgroundPage(). Instead, reload the extension or send a message.
    if (extAPI.runtime && extAPI.runtime.reload) {
        extAPI.runtime.reload();
    } else {
        // fallback: reload settings page
        checkBSvariables();
    }
}

// Update saveFunction to use reloadBackgroundAndSettings
function saveFunction() {
    //first check if mmol
    extAPI.storage.local.get(['unitValue'], function(unitResult) {
        var unitType = Object.values(unitResult)[0];
        var uLSaved = getValueText("urgentLowAlertValue", unitType);
        var lSaved = getValueText("lowAlertValue", unitType);
        var hSaved = getValueText("highAlertValue", unitType);
        var uHSaved = getValueText("urgentHighAlertValue", unitType);
        var uLCheckbox = getCheckValue("urgentLowEnabled");
        var lCheckbox = getCheckValue("lowEnabled");
        var hCheckbox = getCheckValue("highEnabled");
        var uHCheckbox = getCheckValue("urgentHighEnabled");
        var themeList = getListValue("themeBox");
        var snoozeLength = getValueText("alarmSnoozeLength");
        console.log(themeList);
        console.log(uLSaved, lSaved, hSaved, uHSaved);
        //double check that they're all actual 
        if (uLSaved != false && lSaved != false && hSaved != false && uHSaved != false) {
        	if(uLSaved < lSaved){}else{alertFunc("ERROR: Urgent low alert value must be below the low alert value."); return;}
        	if(uHSaved > hSaved){}else{alertFunc("ERROR: Urgent high alert value must be above the high alert value."); return;}
        	if(lSaved < hSaved){}else{alertFunc("ERROR: Low alert value must be below the high alert value."); return;}
        	//make sure low values and high values are correct.
            //now, parse the site url and see if it's a real site.
            getURLText(function(returnVal) {
                if (returnVal != false) {
                    extAPI.storage.local.set({
                        siteUrl: returnVal
                    }, function() {
                        console.log("SAVED SITE URL!");
                        extAPI.storage.local.set({
                            alarmValues: [
                                [uLSaved, uLCheckbox],
                                [lSaved, lCheckbox],
                                [hSaved, hCheckbox],
                                [uHSaved, uHCheckbox]
                            ]
                        }, function() {
                            console.log('SAVED DATA!');
                            extAPI.storage.local.set({
                                snoozeMinutes: snoozeLength
                            }, function() {
                                extAPI.storage.local.set({colors:themeList},function(){
                                    reloadBackgroundAndSettings();
                                });
                            });
                        });
                    });
                } else {
                    alertFunc("ERROR: Invalid Site URL.");
                }
            });
        } else {
            //whoopsies, we got some bad data owo
            alertFunc("ERROR: Invalid Number.");
        }
    });
}

// Refactor permissions request to use extAPI if available
function requestPermissions(origins, callback) {
    if (extAPI.permissions && extAPI.permissions.request) {
        extAPI.permissions.request({ origins: [origins] }, callback);
    } else {
        // Firefox may not support dynamic permissions; assume granted
        callback(true);
    }
}

document.getElementsByClassName("submitButton")[0].onclick = function() {
    //when submit button clicked, do some stuff.
    //
	possibleUrlValues(function(urlArray,isHeroku){
		//console.log(isHeroku);
		//console.log(urlArray);
		if(isHeroku == true){
			saveFunction();
		}else{
			console.log("NOT HEROKU");
			requestPermissions(urlArray[1], function(granted) {
				if (granted) {
					saveFunction();
				} else {
					alertFunc("ERROR: Permissions must be manually granted on non-heroku sites.");
				}
			});
		}
	});
}
window.onload = function() {
    //just loading! load all the data to display in settings now.
    checkBSvariables();
}