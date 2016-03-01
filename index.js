/**
* index.js
*
* agency is an asynchronous execution flow control utility for node.js 
* based on dependencies defined by a logical expression.
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

/*jshint newcap: false*/

function agency() {
  'use strict'; 
  
  var agent = require('./lib/agent');  
  var journal = require('./lib/journal'); 
  var jn = journal();

  // private properties
  var agents = [];
  var modes = ['q', 'v', 'l']; // 'Quiet', 'Verbose', 'Log'
  var defaultMode = 'v';
  var args;
  var mode;
  var agentInterface;
  var err = new Error();
  var logFile;

  // arguments handling
  if (arguments instanceof Array) {
    args = arguments;
  } else {
    args = Array.prototype.slice.call(arguments);
  }
		
  if (args[0] !== undefined) {
    if (modes.indexOf(args[0]) !== -1) {
      mode = args[0];
    } else {
      mode = defaultMode;
    }
  } else {
    mode = defaultMode;
  }

  jn.setLogMode(mode);
  
  // returns a boolean value for each dependency of the current agent indicating
  // if is was already executed or is queued for execution (see difDepCheck flag)
  function hasAgentExecuted(agentsList, dependency, currAgent) {
    var ret; 

    for (var i = 0; i < agentsList.length; i++) {
      if (agentsList[i].getId() === dependency) {
        if (!currAgent.getDeffDepCheck()) {
          return agentsList[i].getExecuted();
        } else {
          ret = agentsList[i].getExecuted() ? true : agentsList[i].getWaitingExec();
          return ret;
        }
      }
    }
    
    err.error = 'InvalidDependency';
    err.message = 'execution failed (invalid dependency agent: ' + dependency + ')';
    return err;
  }
  
  // replaces the agent's dependency list ids with the correspondent boolean 
  // values to indicate if they were already executed
  function replaceByLogicalValue(tokenArray, id, bool) {
    var len = tokenArray.length;
    var ret = tokenArray.slice();
    
    for (var i = 0; i < len; i++) {
      if(ret[i] === id) {
        ret[i] = bool;
      }
    }
    return ret;
  }

  // evaluates the agent's logical dependency list and returns a boolean indicating if the
  // dependency agents have completed and therefore allow for the execution of the dependent agent
  function evaluateLogicalExpression(agent) {
    var len = agent.getDependencies().length;
    var expression = agent.getExpression();
    var dep; 
    var agentExecuted;
    var ret = agent.getTokenizedExpression();
    var logicalEval;

    for (var i = 0; i < len; i++) {
      dep = agent.getDependencies()[i];
      agentExecuted = hasAgentExecuted(agents, dep, agent);

      if (agentExecuted instanceof Error) {
        return agentExecuted; 
      } else {
        ret = replaceByLogicalValue(ret, dep , agentExecuted);
      }
    }

    logicalEval = eval(ret.join(''));
    return logicalEval;
  }

  // returns a boolean value indicating the end of the 
  // agency execution by checking if no agents await execution
  function hasAgencyCompleted() {
    var ret = true;
    var len = agents.length;

    for (var i = 0; i < len; i++) {
      if (agents[i].getWaitingExec()) {
        ret = false;
      }  
    }
    return ret;
  }

  // calls the journal's module function that prints the execution
  // log on the specified file 
  function report() {
    if (mode === 'l') {
      jn.report(logFile);
    }
  }

  // method that allows one agent to communicate with one of its dependencies,
  // returns the dependency agent's function result
  function getAgentValue(id) {
    var len = agents.length;

    for (var i = 0; i< len; i++) {
      if (agents[i].getId() === id) {
        return agents[i].getResult();
      }
    } 

    jn.logExecutionEvent(id, 'INFO', 'result could not be retrieved', (new Date()).toJSON());
  }

  // method called during agent creation to check if there is
  // a possible agent id duplication
  function isIdInUse(id) {
    var ret = false;
    var len = agents.length;

    for (var i = 0; i < len; i++) {
      if (agents[i].getId() === id) {
        ret = true;
      }  
    }
    return ret;
  }

  // controls the execution of agents based on the current status and on its dependencies; reports
  // when there are no more agents to run
  function runAgents() {
    var len = agents.length;
    var checkDependency;

    for (var i = 0; i < len; i++) {
      if (!agents[i].getExecuted() && !agents[i].getWaitingExec() && agents[i].getCanExecute()) {
        if (agents[i].getExpression() === '') {
          agents[i].execute();
        } else {
          checkDependency = evaluateLogicalExpression(agents[i]);
          if (checkDependency instanceof Error) {
            jn.logExecutionEvent(agents[i].getId(), 'ERROR', checkDependency.message, (new Date()).toJSON());
          } else {
            if (checkDependency) {
              agents[i].execute();
            }
          } 
        }
      }
    }
    if (hasAgencyCompleted()) {
      report();
    }
  }

  // sets the name and location of the log file if that was the log method - if not
  // defined log will be written in a default directory/file
  function setLogFile(fileName) {
    logFile = fileName;  
  }

  // returns an object that exposes only the necessary methods needed by the agent module
  // to communicate with the agency
  function createAgentInterface() {
    return {
      getAgentValue: getAgentValue,
      isIdInUse: isIdInUse,
      runAgents: runAgents,
      report: report
    };
  }

  agentInterface = createAgentInterface();

  // creates a new agent; receives an obligatory id and an optional dependency list;
  // returns an external interface with a subset of its methods
  function createAgent(id, expr) {
    var ag;
    var validId; 
    var parsedExpression;
    var agentExternalInterface;

    jn.logCreationEvent(id, 'INFO', 'creation initialized', (new Date()).toJSON());
    ag = agent(agentInterface, jn);
    validId = ag.validateId(id);
    if (!(validId instanceof Error)) { 
      ag.setId(id);
      jn.logCreationEvent(id, 'INFO', 'id validation completed', (new Date()).toJSON());
      parsedExpression = ag.parseExpression(expr);
      if (!(parsedExpression instanceof Error)) {
        jn.logCreationEvent(id, 'INFO', 'dependency expression validated', (new Date()).toJSON());
        ag.setExecuted(false);
        ag.setWaitingExec(false);
        ag.setDeffDepCheck(false);
        ag.setHaltExecution(false);
        ag.setCanExecute(true);
        jn.logCreationEvent(id, 'INFO', 'creation completed', (new Date()).toJSON());
      } else {
        ag.setCanExecute(false);
        jn.logCreationEvent(id, 'ERROR', parsedExpression.message, (new Date()).toJSON());
      }
    } else {
      ag.setCanExecute(false);
      jn.logCreationEvent(id, 'ERROR', validId.message, (new Date()).toJSON());
    }
    agents.push(ag);

    agentExternalInterface = {
      setFunction: ag.setFunction,
      setCallback: ag.setCallback,
      setHaltExecution: ag.setHaltExecution,
      setDeffDepCheck: ag.setDeffDepCheck 
    };
    return agentExternalInterface;
  }


  // public interface
  return {
    createAgent: createAgent,
    runAgents: runAgents,
    setLogFile: setLogFile
  };
}

module.exports = agency;
