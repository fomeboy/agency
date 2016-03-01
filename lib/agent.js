/**
* agent.js
*
* The agent module implements the logic of the independent execution units
* that constitute an agency. The code of each unit is wrapped in a function as well 
* as the optional callback.
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

function agent(agency, jn) {
  'use strict';

  // private properties
  var id;
  var expression;
  var tokenizedExpression; 
  var dependencies;
  var func;
  var callback;
  var canExecute;
  var executed; 
  var result;
  var waitingExec;
  var deffDepCheck;
  var haltsExecution;
  var err = new Error();

  // getter for the id property
  function getId() {
    return id;
  }

  // setter for the id property
  function setId(identifier) {
    id = identifier;
  }

  // validates the agent's id according to the validity of the symbols used
  // and the possibility of duplication inside the same agency 
  function validateId(id) {
    if (id && id.trim() && /^[a-zA-Z0-9_]+$/.test(id)) {
      if (agency.isIdInUse(id)) {
        err.name = 'DuplicateIdError';
        err.message = 'duplication (use a different id)'; 
        return err;
      } else {
        return id;
      }
    } else {
      err.name = 'ValidateIdError';
      err.message = 'failed id validation (please use alphanumeric characters and underscore)'; 
      return err;
    }
  } 

  // returns a list of unique dependency agents
  function arrayGetUniques(arr) {
    var a = [];
      for (var i=0, l=arr.length; i<l; i++) {
        if (a.indexOf(arr[i]) === -1 && arr[i] !== '')
          a.push(arr[i]);
      }
      return a;
  }

  // parses the dependency logical expression of each agent and populates
  // the auxiliary structures used by the agency to control the flow of execution
  function parseExpression(expr) {
    var parentList = [];
    var parsedTokenizedExpression = [];
    var parsedExpression = '';
    var testInvalidChar;

    if (expr && expr.trim()) {
      parsedExpression = expr.replace(/\040/g, '');
      testInvalidChar = /[^a-zA-Z0-9_&|!()_]/.test(parsedExpression); //valid characters

      if (!testInvalidChar) {
          var pos = '0';
          var prevprev = '?';
          var prev = '?';
          var head = '';
          var key = '';
          var rbrackets = 0;
          var tmpparent = '';
          var tmpexpression = '';
          
          // parser rules:
          //
          // left hand side of rule determines the rule to apply to the current element of the expression:
          //
          //   first element of key indicates the position of the expression element being evaluated:
          //    1 - first position
          //    n - other position
          //   second element of key represents the position before the previous position:
          //    ? - don't care
          //    & - logical AND
          //    | - logical OR
          //   third element of key represents the previous position on the expression:
          //    ? - don't care
          //    ( - opening parenthesis
          //    # - alpha numeric characters and underscore
          //    ) - closing parenthesis
          //    ! - logical NOT
          //
          // right hand side of rule represents valid symbols for that key
          //
          // example:
          //
          //  parsing expression 'a&&b' (one position at a time):
          //  
          //  - 'a' element is evaluated by first rule:
          //    key: 1st position, before previous and previous positions elements don't care
          //    validation: any alpha numeric character or open parenthesis or underscore or NOT 
          //  - '&' element is evaluated by the third rule:
          //    key: (any position but first, indiferent before previous element, any valid previous element)
          //    validation: any alpha numeric character or closing parenthesis or underscore or AND or OR 
          //  - '&' element is evaluated by sixth rule:
          //    key: any position but first, indiferent before previous element, OR previous element
          //    validation: value has to be '&'
          //  - 'b' element is evaluated by the seventh rule:
          //    key: any position but first, '&' before previous element, '&' previous element
          //    validation: any alpha numeric character or open parenthesis or underscore or NOT or opening parenthesis
          //  
          var rules = {
            '1??': /[a-zA-Z0-9_(!]/,
            'n?(': /[a-zA-Z0-9_(!]/,
            'n?#': /[a-zA-Z0-9_)&|]/,
            'n?!': /[a-zA-Z0-9_(]/,
            'n?)': /[&|)]/,
            'n?&': /[&]/,
            'n&&': /[a-zA-Z0-9_(!]/,
            'n&#': /[a-zA-Z0-9_)&|]/,
            'n&(': /[a-zA-Z0-9_(!]/,
            'n?|': /[|]/,
            'n||': /[a-zA-Z0-9_(!]/,
            'n|(': /[a-zA-Z0-9_(!]/,
            'n|#': /[a-zA-Z0-9_)&|]/,
            'n|&': /[]/,
            'n&|': /[]/,
          };

          for (var i = 0; i < parsedExpression.length; i += 1) {
            pos = (i === 0 ? '1' : 'n');
            head = parsedExpression.charAt(i);
            key = pos + prevprev + prev;

            if (!rules[key].test(head)) {
              err.code = 'InvalidCharacter';
              err.message = 'failed dependency expression validation (invalid character at position ' + (i + 1) + ')'; 
              return err;
            }

            if (head === '(') {
              rbrackets += 1;
            }

            if (head === ')') {
              if (rbrackets <= 0) {
                err.code = 'UnopenedParentheses';
                err.message = 'failed dependency expression validation (unopened parenthesis)'; 
                return err;
              } else {
                rbrackets -= 1;
              }
            }

            // last character
            if (i === parsedExpression.length - 1) {
              // ), # -> expression terminators
              if (/[a-zA-Z0-9)]/.test(head)) {
                if (rbrackets !== 0) {
                  err.code = 'UnclosedParentheses';
                  err.message = 'failed dependency expression validation (unclosed parenthesis)';
                  return err;
                }
              } else {
                err.code = 'InvalidTerminator';
                err.message = 'failed dependency expression validation (invalid expression terminator)';
                return err;
              }
            } else {
              if (prev === '&' || prev === '|') {
                prevprev = prev;
              } else {
                prevprev = '?'; // ? -> don't care
              }

              if (/[a-zA-Z0-9_]/.test(head)) {
                prev = '#'; // # -> valid identifier character
              } else {
                prev = head;
              }

            }
            
            // handle parent list and tokenized expression
            if (/[a-zA-Z0-9_]/.test(head)) {
              
              if (tmpexpression !== '') {
                parsedTokenizedExpression.push(tmpexpression);
                tmpexpression = '';
              }
              
              if (parsedExpression.length === 1) {
                if (id === head) {
                  err.name = 'SelfDependency';
                  err.message = 'failed dependency expression validation (agent self dependency)';
                  return err;
                } else {
                  parentList.push(head); 
                  parsedTokenizedExpression.push(head);
                }
              } else {
                if (i === parsedExpression.length - 1) {
                  tmpparent = tmpparent + head;
                  if (id === tmpparent) {
                    err.name = 'SelfDependency';
                    err.message = 'failed dependency expression validation (agent self dependency)';
                    return err;
                  } else {  
                    parentList.push(tmpparent); 
                    parsedTokenizedExpression.push(tmpparent);
                  }
                } else {
                  tmpparent = tmpparent + head;
                }
              }
              
            } else {
              if (tmpparent !== '') {
                if (id === tmpparent) {
                  err.name = 'SelfDependency';
                  err.message = 'failed dependency expression validation (agent self dependency)';
                  return err;
                } else {
                  parentList.push(tmpparent);
                  parsedTokenizedExpression.push(tmpparent);
                  tmpparent = '';
                }
              }
              tmpexpression = tmpexpression + head;
              if (i === parsedExpression.length - 1) {
                parsedTokenizedExpression.push(tmpexpression);
              }
            }
          
          }
        expression = parsedExpression;
        tokenizedExpression = parsedTokenizedExpression;
        dependencies = arrayGetUniques(parentList); 
      } else {
        err.name = 'InvalidExpression';
        err.message = 'failed dependency expression validation (please use underscore, alphanumeric and logical chars)';
        return err;
      }
    } else {
      expression = '';
      dependencies = []; 
      tokenizedExpression = [];
    }

  }

  // getter for dependencies property 
  function getDependencies() {
    return dependencies;
  }
  
  // getter for expression property
  function getExpression() {
    return expression;
  }
  
  // getter for tokenizedExpression property
  function getTokenizedExpression() {
    return tokenizedExpression;
  }
  
  // setter for canExecute flag property
  function setCanExecute(flag) {
    canExecute = flag; 
  }
  
  // getter for canExecute property
  function getCanExecute() {
    return canExecute;
  }

  // setter for function property
  function setFunction(f) {
    if (canExecute) {
      if (Object.getPrototypeOf(f) === Function.prototype) {
        func = f;
        jn.logCreationEvent(id, 'INFO', 'function definition completed', (new Date()).toJSON());
      } else {
        setCanExecute(false);
        jn.logCreationEvent(id, 'ERROR', 'function definition failed', (new Date()).toJSON());
      }
    } 
  }

  // setter for callback property
  function setCallback(cb) {
    if (canExecute) {
      if (Object.getPrototypeOf(cb) === Function.prototype) {
        callback = cb;
        jn.logCreationEvent(id, 'INFO', 'callback definition completed', (new Date()).toJSON());
      } else {
        setCanExecute(false);
        jn.logCreationEvent(id, 'ERROR', 'callback definition failed', (new Date()).toJSON());
      }
    }
  }

  // setter for result property
  function setResult(res) {
    if (res) {
      result = res;
    } else
    {
      result = null;
    }
  }
  
  // getter for result property
  function getResult() {
    return result;
  }

  // setter for executed flag property
  function setExecuted(flag) {
    executed = flag; 
  }

  // getter for executed property
  function getExecuted() {
    return executed;
  }

  // setter for waitingExec flag property
  function setWaitingExec(flag) {
    waitingExec = flag;
  }

  // getter for waitingExec property
  function getWaitingExec() {
    return waitingExec;
  }

  // setter for deffDepCheck flag property
  function setDeffDepCheck(flag) {
    deffDepCheck = flag;
  }

  // getter for deffDepCheck property
  function getDeffDepCheck() {
    return deffDepCheck;
  }

  // setter for haltsExecution flag property
  function setHaltExecution(flag) {
    haltsExecution = flag;
  }

  // gets value of a dependency agent's execution (inter agent communication);
  // wraps a call to the agency method
  function getValueOfAgent(dep) {
    var len = dependencies.length;

    for (var i = 0; i < len; i++) {
      if (dep === dependencies[i]) {
        return agency.getAgentValue(dep);
      }
    }
    jn.logExecutionEvent(id, 'INFO', 'could not get value of agent ' + dep + ' (not a dependency)', (new Date()).toJSON());
    return null;
  }

  // asynchronously executes the agent's function (wrapper for user defined code) and the optional corresponding callback
  // following the callback contract: callback(error, data); validates the continuation of the agency in case
  // of error during execution of current agent 
  function execute() {
    var res;
    var functionInterface  = {getValueOfAgent: getValueOfAgent};

    if (func) { 
      setWaitingExec(true);
      setTimeout(
          function () {
            var errorOnExecution = false;
            jn.logExecutionEvent(id, 'INFO', 'began function execution', (new Date()).toJSON());
            try {
              res = func(functionInterface);
              setResult(res);
              if (callback) {
                callback(null, res);
              }
              jn.logExecutionEvent(id, 'INFO', 'function executed whitout errors', (new Date()).toJSON());
            } catch (err) {
              errorOnExecution = true; 
              setResult(err);
              jn.logExecutionEvent(id, 'ERROR', 'failed to execute function: ' + err.message, (new Date()).toJSON());
              if (callback) {
                callback(err);
              }
            }
            setExecuted(true);
            setWaitingExec(false);
            if (haltsExecution && errorOnExecution) {
              jn.logExecutionEvent(id, 'ERROR', 'error on execution halted agency execution', (new Date()).toJSON());
              agency.report();
            } else {
              agency.runAgents();
            } 
          }, 0);
    } else {
      jn.logExecutionEvent(id, 'INFO', 'does not have a defined function', (new Date()).toJSON());
    }
  }

  // public interface
  return {
    getId: getId,
    validateId: validateId,
    setId: setId,
    parseExpression: parseExpression,
    getDependencies: getDependencies,
    getExpression: getExpression,
    getTokenizedExpression: getTokenizedExpression,
    setFunction: setFunction,
    setCallback: setCallback,
    setCanExecute: setCanExecute,
    getCanExecute: getCanExecute,
    setResult: setResult,
    getResult: getResult,
    setExecuted: setExecuted,
    getExecuted: getExecuted,
    setWaitingExec: setWaitingExec,
    getWaitingExec: getWaitingExec,
    setDeffDepCheck: setDeffDepCheck,
    getDeffDepCheck: getDeffDepCheck,
    setHaltExecution: setHaltExecution,
    execute: execute
  };
  
}

module.exports = agent;
