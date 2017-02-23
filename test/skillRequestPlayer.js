"use strict";
var assert = require('assert');
var fs = require('fs');
var uuid = require('uuid');

// Globals
// Future: consider .config file// output directory to use for persisting Recordings.
var skillsRequestFolder = "test/skillrequests/";

// mocha --debug-brk
var logger = require('../common/logger');

// Let caller override the folder to look for the Skills request file.
exports.setSkillsRequestFolder = function setSkillsRequestFolder(folder) {
    skillsRequestFolder = folder;
}

// helper methods
exports.runSkillRequestTestFile = function runSkillRequestTestFile(skillRequestFile, done) {
    // Load in Fetch Alexa Skill
    var fetch = require('../fetchskill/index');

    var originalGraphClient = fetch.getMicrosoftGraph();

    // Load in Stub classes.
    var microsoftGraphStub = require("./stubs/microsoft-graph-client");

    // Set fetch to use the GraphStub.
    fetch.setMicrosoftGraph(microsoftGraphStub.Client);

    var testCase = LoadJSONTesFile(skillRequestFile);

    // break the test into the properties.
    var serviceRequest = testCase.serviceRequest;
    var graphMailBoxSettingsRequest = testCase.graphMailBoxSettingsRequest;
    var graphMailBoxSettingsResponseError = testCase.graphMailBoxSettingsResponseError;
    var graphMailBoxSettingsResponse = testCase.graphMailBoxSettingsResponse;
    var graphcalendarViewRequest = testCase.graphcalendarViewRequest;
    var graphcalendarViewResponseError = testCase.graphcalendarViewResponseError;
    var graphcalendarViewResponse = testCase.graphcalendarViewResponse;
    var expectedServiceResponseSucceed = testCase.serviceResponseSucceed;
    var expectedServiceResponseFail = testCase.serviceResponseFail;

    // Setup the Graph calls and response.
    microsoftGraphStub.clearPathMappings();
    microsoftGraphStub.addPathMapping(graphMailBoxSettingsRequest, graphMailBoxSettingsResponse, graphMailBoxSettingsResponseError);
    microsoftGraphStub.addPathMapping(graphcalendarViewRequest, graphcalendarViewResponse, graphcalendarViewResponseError);

    // invoke the Skill

    var context = {
        succeed: function(response) {

            var expectedOutputString = JSON.stringify(expectedServiceResponseSucceed);
            var reponseString = JSON.stringify(response);

            if (expectedOutputString != reponseString) {
                console.log(expectedOutputString);
                console.log(reponseString);
            }

            assert.equal(expectedOutputString, reponseString);

            fetch.setMicrosoftGraph(originalGraphClient); // Set back the graph client.
            done();
        },
        fail: function(response) {
            assert.equal(JSON.stringify(expectedServiceResponseFail), JSON.stringify(response));
            fetch.setMicrosoftGraph(originalGraphClient); // Set back the graph client.
            done();
        }
    };

    //  context.logger = new logger.Logger(uuid.v1());

    logger.attach(context);
    routeLambdaNoProxy(serviceRequest, context, fetch.handler);
}

// creates a json object from the givein file path for the Skill Request
// and the expected response.
function LoadJSONTesFile(fileName) {

    var fileFullPath = skillsRequestFolder + fileName;

    var testFile = fs.readFileSync(fileFullPath, 'utf-8');
    return JSON.parse(testFile);
}

// similiar to router in the lambdarouter used by tests to  
function routeLambdaNoProxy(event, context, lambda) {
    lambda(event, context);
}