# agency
Dependency based asynchronous flow control utility for [Node.js](http://nodejs.org).


## Philosophy

" never wait, never block, finish fast "

Respecting the nature of Node.js, *agency* encourages the use of independent, non blocking, fast running units of execution called agents. *agency* controls the execution flow of agents by looking at their dependency list defined by a logical expression. Inter agent communication allows greater arquitecture flexibility and additional conditional execution.

## Installation

```bash
$ npm install agency
```

#### Usage case #1
*agency set up and single agent creation and execution*

```js
var ag = require('agency');

// creates new agency and sets logging to verbose mode (output to console)
var agency = ag('v');

// creates new agent 'id1'
var agent = agency.createAgent('id1');

// defines agent code
agent.setFunction(function() {console.log('agent id1 executed!');}); 

// run agents
agency.runAgents();
```

#### Usage case #2
*agency with dependency execution*

```js
var ag = require('agency');

var agency = ag('v');

// agent 'id3' will be executed after 'id1' and 'id2'
var agent3 = agency.createAgent('id3', 'id1&&id2');
agent3.setFunction(function () { console.log('agent id3 executed!'); });

// defines agent 'id1'
var agent = agency.createAgent('id1');
agent.setFunction(function () { console.log('agent id1 executed!'); });

// defines agent 'id2'
var agent2 = agency.createAgent('id2');
agent2.setFunction(function () { console.log('agent id2 executed!'); });

// run agents
agency.runAgents();
```

#### Usage case #3
*cascading agency with execution interruption*

```js
var ag = require('agency');

var agency = ag('l');

// log will be written to specified file;
// on error log will be written on default file [timestamp].log
agency.setLogFile('UsageCase#3.log');

// defines agent 'id1'
var agent = agency.createAgent('id1');
agent.setFunction(function () { console.log('agent id1 executed!'); });

// agent 'id2' will be executed after 'id1'
var agent2 = agency.createAgent('id2', 'id1');
agent2.setFunction(function () { console.log('agent id2 executed!'); });

// agent 'id3' will be executed after 'id2'
var agent3 = agency.createAgent('id3', 'id2');
agent3.setFunction(function () {
    var err = new Error('agent 3 error');
    console.log('agent id3 executed!');
    throw err;
});
agent3.setHaltExecution(true);

// agent 'id4' will not run because 'id3' error stopped the agency execution
var agent4 = agency.createAgent('id4', 'id3');
agent4.setFunction(function () { console.log('agent id4 executed!'); });

// run agents
agency.runAgents();
```

#### Usage case #4
inter agent communication

```js
var ag = require('agency');

var agency = ag('v');

// defines agent 'id1'
var agent = agency.createAgent('id1');

agent.setFunction(function () {
    console.log('agent id1 executed!');
    return 10;
});

// agent 'id2' will be executed after 'id1'
var agent2 = agency.createAgent('id2', 'id1');

// agent 'id2' executes conditionally according to 'id1' result 
agent2.setFunction(function (inter) {
    var depResult = inter.getValueOfAgent('id1');
    var res;
    
    if (depResult instanceof Error) {
        return depResult;
    } else {
        res = 10 + depResult;
        console.log(res);
        return res;
    }
 
});

// defines a callback for agent 'id2' using the standard contract
agent2.setCallback(function (err, data) { 
    if (err) {
        console.log(err.message);
    } else {
        console.log('id2 callback executed: ' + data); 
    }
});

// run agents
agency.runAgents();
```

#### Usage case #5
deferred dependency checking

```js
var ag = require('agency');

var agency = ag('q');

var agent1 = agency.createAgent('id1');
agent1.setFunction(function () { console.log('agent id1 executed'); });
agent1.setCallback(function () { console.log('agent id1 callback has executed!'); });

// runs only if agent id1 has not executed yet
var agent2 = agency.createAgent('id2', '!id1');
agent2.setFunction(function () { console.log('agent id2 executed!'); });
agent2.setCallback(function () { console.log('agent id2 callback has executed!'); });

// test with true or false values to observe different agency execution
// see API setDeffDepCheck section for explanation of flag
agent2.setDifDepCheck(true);

// run agents
agency.runAgents();
```

## API

### agency (mode)

*object constructor, receives the log mode as optional parameter; 'q' represents quiet mode and doesn't report
any activity; 'v' means verbose and outputs the creation and execution events to the console; 'l' stands for log mode and
writes the events into the defined directory/file in JSON format; if the log directory/file is not defined, or cannot be 
written, a default log file with format timestamp.log will be created in the project directory*

- createAgent (id, expr)

  *method used to create a new execution unit; the first parameter id is required and can contain alphanumeric 
  charaters and the underscore; the second parameter is an optional logical expression defining
  the execution dependencies of the agent; all logical expressions containing the symbols '&&', '||', '!',
  '(', ')' are accepted; if no dependecies are defined, agents are executed by creation order*
  
- runAgents ()

  *method that controls the execution of the agents, based on their current status and dependencies list;
  when all agents are executed reports the results; should be the last method called*
  
- setLogFile (fileName)
 
  *sets the directory/file name of the log file*
 
### agent

*created at agency level by the method createAgent(id, expr)* 

- setFunction (function (o) { var agRes = o.getValueOfAgent('id'); }) 

  *sets the code to be executed by the agent wrapped in a function; by default, the first parameter of the defined
  function receives an object o that allows the agent to get the result of any of its dependency agents (see usage case #4)*
  
- setFunction (function () { // your code here })

  *optional call if there is no need for inter agent communication; code to execute is simply wrapped in a function*

- setCallback (function (err, data) {})

  *defines an optional callback function; if the agent defines a callback function it will receive an error object if 
  the agent function execution fails or the value returned by the agent function - only one of the parameters will be
  sent; executed after the agent function has completed (see usage case #4)*
  
- setCallback (function () { // your code here })

  *optional definition of callback if the execution result of the function is not needed*
  
- setHaltExecution (flag)

  *setting this flag to true (false by default) will cause the interruption of the agency execution if the agent 
  execution fails (see usage case #3)*

- setDeffDepCheck (flag)

  *setting this flag to true (false by default) will cause the agency to look not only for the executed state of
  each agent but also its waiting for execution state; executed state is set to true only when the agent has
  actually executed whereas the waiting for execution is set at creation time; decomposing usage case #5 steps:*
    - *flag is set to false* 
        - *the agency will create agent 'id1' [call stack]*
        - *the agency will create agent 'id2' [call stack]*
        - *agency.runAgents() is called*
        - *agent 'id1' has not executed yet so it is queued for execution [placed on event loop]*
        - *agent 'id2' id dependent on 'id1' but since 'id1' has not executed yet it is also queued [event loop]*
        - *agent 'id1' is moved from the event loop to the call stack and executes*
        - *agent 'id2' is moved from the event loop to the call stack and executes*
    - *flag is set to true* 
        - *the agency will create agent 'id1' [call stack]*
        - *the agency will create agent 'id2' [call stack]*
        - *agency.runAgents() is called*
        - *agent 'id1' has not executed yet so it is queued for execution [placed on event loop]*
        - *agent 'id2' id dependent on 'id1' and checks for its execution state (false), but also for its waiting
           for execution state; since it is true it will not queue it for execution*
        - *agent 'id1' is moved from the event loop to the call stack and executes*
  
  
## License

  [MIT](LICENSE)
