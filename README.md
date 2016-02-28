# agency
Dependency based asynchronous flow control utility for [Node.js](http://nodejs.org).

### Philosophy

" never wait, never block, finish fast "

Respecting the nature of Node.js, *agency* encourages the use of independent, non blocking, fast running units of execution called agents. *agency* controls the execution flow of agents by looking at their dependency list defined by a logical expression. Inter agent communication allows greater arquitecture flexibility and additional conditional execution.

### Installation

```bash
$ npm install agency
```

#### Usage case #1
agency set up and single agent creation and execution

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
agency with dependency execution

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
