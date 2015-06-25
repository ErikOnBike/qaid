// ==UserScript==
// @name	QAID
// @namespace	Jira
// @description	Aid for QA
// @include	https://jira.lrgirko.nl/jira/*
// @version	0.1
// @required	http://code.jquery.com/jquery-2.1.4.min.js
// @grant	none
// ==/UserScript==

// Show presence
console.log("In QAID user script");

// Types
var Types = {
	UserStory: "Story",
	LTC: "Logical Test Case"
};
var Replacers = [
	{ name: "upperCase", func: function(match) { return match.toUpperCase(); } },
	{ name: "lowerCase", func: function(match) { return match.toLowerCase(); } }
];

// Constants
var JIRA_SUMMARY_ID = "summary-val";
var JIRA_EDIT_ID = "summary";
var QAID_DIALOG_ID = "qaidDialog";
var QAID_MESSAGE_ID = "qaidMessage";
var QAID_BEAUTIFIER_ID = "qaidBeatifierButton";

// Global variables
var configuration = undefined;

// Initialize QAID system
function initializeQAID() {
	createDialog();
	loadResources(function() {
		window.setInterval(update, 2000);
		console.log("QAID user script finished processing");
	});
}

// Perform (periodic) updates
function update() {
	validate();
	activateBeautifierButtons();
}

// Perform validations
function validate() {
	validateUserStory();
}

// Add execution buttons to QAID dialog for (useful) beautifiers
function activateBeautifierButtons() {
	if(configuration) {
		activateBeautifierButtonForUserStory();
		activateBeautifierButtonForLTC();
	}
}

// Validate user story
function validateUserStory() {

	// Fail early if no user story is present
	var userStoryText = getUserStoryText();
	if(!userStoryText) {
		return;
	}
 
	// Validate user story text against rules
	var validationMessage = "";
	configuration.userStory.validations.forEach(function(validation) {
		try {
			if(!(new RegExp(validation.regex, validation.flags)).test(userStoryText)) {
				validationMessage += " Failed: " + validation.description;
			}
		} catch(e) {
			validationMessage += " Internal error: regex for " + validation.name + " is invalid.";
			console.log(e);
		}
	});

	// Add result in QAID dialog
	document.getElementById(QAID_MESSAGE_ID).textContent = validationMessage;
}

// Activate beautifier button for user story
function activateBeautifierButtonForUserStory() {
	activateBeautifierButtonForType(Types.UserStory);
}

// Activate beautifier button for ltc
function activateBeautifierButtonForLTC() {
	activateBeautifierButtonForType(Types.LTC);
}

// Activate beautifier button for @type
function activateBeautifierButtonForType(type) {

	// Fail early if no beautified text is present or not editable
	var beautifiedText = getBeautifiedTextForType(type);
	if(!beautifiedText) {
		activateButton(QAID_BEAUTIFIER_ID, false);
		return;
	}

	// Create/activate beautifier button in dialog
	if(!document.getElementById(QAID_BEAUTIFIER_ID)) {
		var button = document.createElement("span");
		button.setAttribute("id", QAID_BEAUTIFIER_ID);
		setStyle(button, {
			"cursor": "pointer",
			"margin-top": "1em"
		});
		button.textContent = "[Beautify]";
		button.onclick = function(event) { stealthEvent(event, function() { beautifyType(type); }) };
		document.getElementById(JIRA_SUMMARY_ID).querySelector(".inline-edit-fields").appendChild(button);
	}
	activateButton(QAID_BEAUTIFIER_ID, true);
}

// Beautify user story
function beautifyUserStory() {
	beautifyType(Types.UserStory);
}

// Beautify ltc
function beautifyLTC() {
	beautifyType(Types.LTC);
}

// Beautify @type
function beautifyType(type) {

	// Fail early if no beautified text for @type is present or not editable
	var beautifiedText = getBeautifiedTextForType(type);
	if(!beautifiedText || !jiraShowsEditableType(type)) {
		return;
	}

	// Update text
	document.getElementById(JIRA_EDIT_ID).value = beautifiedText;
}

// Get beautified user story text
function getBeautifiedUserStoryText() {
	return getBeautifiedTextForType(Types.UserStory);
}

// Get beautified ltc text
function getBeautifiedLTCText() {
	return getBeautifiedTextForType(Types.LTC);
}

// Get beautified text for @type
function getBeautifiedTextForType(type) {

	// Fail early if no type is present
	var text = getTextForType(type);
	if(!text) {
		return undefined;
	}

	// Test if beautifiers result in a change
	var beautifiedText = text;
	getBeautifiersForType(type).forEach(function(beautifier) {
		try {
			beautifiedText = beautifiedText.replace(new RegExp(beautifier.regex, beautifier.flags), beautifier.replace);
		} catch(e) {
			console.log(e);
		}
	});

	// Return result (undefined if beautified text is same as original)
	return beautifiedText !== text ? beautifiedText : undefined;
}

// Answer beautifiers for @type
function getBeautifiersForType(type) {
	if(type === Types.UserStory) {
		return configuration.userStory.beautifiers;
	} else if(type === Types.LTC) {
		return configuration.ltc.beautifiers;
	}
	return [];
}

// Check if Jira shows user story
function jiraShowsUserStory() {
	return jiraShowsType(Types.UserStory);
}

// Check if Jira shows LTC
function jiraShowsLTC() {
	return jiraShowsType(Types.LTC);
}

// Check if Jira shows specified @type
function jiraShowsType(type) {
	var typeValue = document.getElementById("type-val");
	if(typeValue) {
		return (new RegExp(type)).test(typeValue.textContent);
	} 
	return false;
}

// Check if Jira shows user story as editable field
function jiraShowsEditableUserStory() {
	return jiraShowsEditableType(Types.UserStory);
}

// Check if Jira shows ltc as editable field
function jiraShowsEditableLTC() {
	return jiraShowsEditableType(Types.LTC);
}

// Check if Jira shows @type as editable field
function jiraShowsEditableType(type) {
	return jiraShowsType(type) && document.getElementById(JIRA_EDIT_ID);
}

// Answer the text of the user story (or undefined if none is shown)
function getUserStoryText() {
	return getTextForType(Types.UserStory);
}

// Answer the text of the ltc (or undefined if none is shown)
function getLTCText() {
	return getTextForType(Types.LTC);
}

// Answer the text of @type
function getTextForType(type) {

	// Fail early if type is not shown
	if(!jiraShowsType(type)) {
		return undefined;
	}

	// Validate if summary field is present
	var summary = document.getElementById(JIRA_SUMMARY_ID);
	if(summary) {

		// Retrieve summary text (in edit or in view mode)
		var edit = document.getElementById(JIRA_EDIT_ID);
		if(edit) {
			return edit.value;
		} else {
			return summary.textContent;
		}
	}

	return undefined;
}

// Create dialog on top of screen
function createDialog() {
	var dialog = document.createElement("div");
	dialog.setAttribute("id", QAID_DIALOG_ID);
	setStyle(dialog, {
		position: "absolute",
		top: "4px",
		left: "40%",
		width: "20%",
		backgroundColor: "rgba(255, 255, 0, 0.9)"
	});
	var message = document.createElement("span");
	message.setAttribute("id", QAID_MESSAGE_ID);
	dialog.appendChild(message);
	document.body.appendChild(dialog);
}

// Set style onto element
function setStyle(element, style) {
	Object.keys(style).forEach(function(key) {
		element.style[key] = style[key];
	});
}

// Perform event handler without Jira noticing
function stealthEvent(event, func) {

	// Stop event handling
	if(!event) {
		event = window.event;
		if(!event) {
			return true;
		}
	}
	if(event.preventDefault) {
		event.preventDefault();
	}
	if(event.stopPropagation) {
		event.stopPropagation();
	}
	if(event.stopImmediatePropagation) {
		event.stopImmediatePropagation();
	}
	if(event.cancelBubble != undefined) {
		event.cancelBubble = true;
	}

	// Perform function
	func();

	return true;
}

// Activate buttons in dialog
function activateButton(buttonId, active) {
	var button = document.getElementById(buttonId);
	if(button) {
		button.style["display"] =  active ? "inline" : "none";
	}
}

// Load resources from GitHub
function loadResources(callback) {
	var jsonRequest = new XMLHttpRequest();
	jsonRequest.url = "https://raw.githubusercontent.com/ErikOnBike/qaid/master/configuration.json";
	jsonRequest.onload = function() {
		try {
			configuration = JSON.parse(this.responseText);
		} catch(e) {
			console.log("Failed to read configuration");
			return;
		}
		if(!configuration.userStory || !configuration.ltc) {
			console.log("Invalid configuration (userStory or ltc missing)");
			return;
		}

		// Wash and clean configuration
		denormalizeBeautifiers();
		removeUnknownBeautifiers();
		setSpecialBeautifiers();

		callback();
	};
	jsonRequest.open("get", jsonRequest.url, true);
	jsonRequest.send();
}

// De-normalize beautifiers
function denormalizeBeautifiers() {
	var denormalizeBeautifier = function(beautifier) {
		if(!beautifier.regex) {
			var namedBeautifier = configuration.beautifiers.reduce(function(result, globalBeautifier) {
				if(!result) {
					if(globalBeautifier.name === beautifier.name) {
						result = globalBeautifier;
					}
				}
				return result;
			}, undefined);
			if(namedBeautifier) {
				beautifier.regex = namedBeautifier.regex;
				beautifier.flags = namedBeautifier.flags;
				beautifier.replace = namedBeautifier.replace;
				beautifier.description = namedBeautifier.description;
			} else {
				console.log("Unknown beautifier: " + beautifier.name)
			}
		}
	};
	configuration.userStory.beautifiers.forEach(denormalizeBeautifier);
	configuration.ltc.beautifiers.forEach(denormalizeBeautifier);
}

// Remove unknown beautifiers
function removeUnknownBeautifiers() {
	var validBeautifiers = function(beautifier) {
		return beautifier.regex;
	};
	configuration.userStory.beautifiers = configuration.userStory.beautifiers.filter(validBeautifiers);
	configuration.ltc.beautifiers = configuration.ltc.beautifiers.filter(validBeautifiers);
}

// Set special replacer functions
function setSpecialBeautifiers() {
	var setSpecialBeautifier = function(beautifier) {
		var replacer = Replacers.reduce(function(result, replacer) {
			if(!result) {
				if(beautifier.replace === replacer.name) {
					 result = replacer;
				}
			}
			return result;
		}, undefined);

		// If replacer function use it
		if(replacer) {
			beautifier.replace = replacer.func;
		}
	};
	configuration.userStory.beautifiers.forEach(setSpecialBeautifier);
	configuration.ltc.beautifiers.forEach(setSpecialBeautifier);
}

// Finish handling user script
if(document.readyState === "complete") {
	initializeQAID();
} else {
	window.addEventListener("load", initializeQAID, false);
}
