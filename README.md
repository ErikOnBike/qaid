# Quality Assurance Aid
Plugin for supporting a QA role in reviewing task.

Currently only supports Jira using a user script.

## Installation
Install the user script:
* *Firefix* Install [Greasemonkey](https://addons.mozilla.org/nl/firefox/addon/greasemonkey/) and from there install the user script.
* *Chrome* Go to URL chrome://extensions and drag script into window. When updating the script, first remove the old script before dragging in the new one.
* *Safari* (Untested) Install [NinjaKit](https://github.com/os0x/NinjaKit) and ...well, let me know how things work out.

## Support
The following features are supported:
* *Validation* Validate whether a user story or logical test case conforms to certain criteria.
* *Beautify* Beautify user story or logical test case to make text consistent.

Currently QAID only supports validating if User Stories are in the correct Dutch form "Als ... wil ik... zodat|omdat...". The User Story is assumed to be in the summary field at the top. Support for the user story in the description field will be added shortly.

QAID has support for two simple beautifiers: removing leading and trailing whitespace and capitalizing the first character of a user story or logical test case.
