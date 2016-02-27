# agency
Dependency based asynchronous flow control utility for [Node.js](http://nodejs.org).

### Philosophy

"Never wait; Never block; Finish fast"

Respecting the nature of Node.js, *agency* encourages the use of independent, fast running, non blocking units of execution called agents. *agency* controls the execution flow of agents by looking at their dependency list defined by a logical expression. Inter agent communication allows greater arquitecture flexibility and additional conditional execution.
