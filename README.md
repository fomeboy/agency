# agency
Dependency based asynchronous flow control utility for [Node.js](http://nodejs.org).

### Philosophy

"Never wait; Never block; Finish fast"

Respecting the nature of Node.js, *agency* encourages the use of small, independent, fast executing non blocking units of execution. The *agency* controls the execution flow of these *agents* by looking at their dependency list defined by a logical expression. 
