/**
* journal.js
*
* The journal module implements the logging logic of agency.js  
* Three methods are available by passing a parameter to the agency constructor:
*  'q' quiet, produces no log
*  'v' verbose, log is displayed on the console (recommended during development)
*  'l' log, writes the creation and execution events in a file (recommended for production) 
*
* Copyright 2016 Fernando Pires
*
* Released under the MIT License.  
* 
* --------------------------------------------------------
*
* author:  Fernando Pires
* version: 1.0.0
*/

function journal() {
  'use strict';
  
  var fs = require('fs');

  // private properties
  var eventList = {
    'creationEvents' : {},
    'executionEvents' : {} 
  };
  var logMode;

  // sets the log method: 'q', 'v' or 'l'
  // exposed by the agency constructor
  function setLogMode(mode) {
    logMode = mode;
  }
 
  // records the agent's validation and creation events in a temporary structure if log method is 'l' or 
  // outputs the same events to the console if method is 'v' 
  function logCreationEvent(id, type, message, time) {
    
    if (logMode === 'l') {
      if (!eventList.creationEvents[id]) {
        eventList.creationEvents[id] =  [];
      }
      eventList.creationEvents[id].push({'type': type, 'event': message, "timestamp": time});
    } else if (logMode === 'v') {
      console.log(type + ': Agent ' + id +  ' ' + message + ' on ' + time);
    }

  }

  // records the agent's execution events in a temporary structure if log method is 'l' or 
  // outputs the same events to the console if method is 'v' 
  function logExecutionEvent(id, type, message, time) {

    if (logMode === 'l') {
      if (!eventList.executionEvents[id]) {
        eventList.executionEvents[id] =  [];
      }
      eventList.executionEvents[id].push({'type': type, 'event': message, "timestamp": time});
    } else if (logMode === 'v') {
      console.log(type + ': Agent ' + id +  ' ' + message + ' on ' + time);
    }

  }

  // outputs the contents of the temporary creation and execution structure to a specific file
  // defined by the user; if file is not defined outputs to a default file; otherwise outputs error to the console
  function report(logFile) {
    var defaultLogFile = (new Date()).toJSON() + '.log';
    var data = JSON.stringify(eventList, null, 3);

    if (logFile) {
      fs.writeFile(logFile, data, function(err) {
        if(err) {
          console.log('\nCould not write log to file "' + logFile + '"\n' + err);
          fs.writeFile(defaultLogFile, data, function(err) {
            if(err) {
              console.log('Could not write log file: ' + err);
            } else {
              console.log('Log was written on default file "' + defaultLogFile + '"');
            }
          });
        }
      });
    } else {
      fs.writeFile(defaultLogFile, data, function(err) {
        if(err) {
          console.log('Could not write log file: ' + err);
        }
      });
    }
  }

  //public interface
  return {
    setLogMode: setLogMode,
    logCreationEvent: logCreationEvent,
    logExecutionEvent: logExecutionEvent,
    report: report
  };
}

module.exports = journal;
