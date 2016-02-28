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
Simple agency and agent creation and execution

```js
var ag = require('agency');

// creates new agency and sets logging to verbose mode
var agency = ag('v');

// creates new agent 'id1'
var agent = agency.createAgent('id1');

// defines agent code
agent.setFunction(function() {console.log('agent id1 executed!');}); 

// run agents
agency.runAgents();
```
