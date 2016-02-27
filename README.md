# agency
Dependency based asynchronous flow control utility for [Node.js](http://nodejs.org).

### Philosophy

"Never wait; Never block; Finish fast"

Respecting the nature of Node.js, *agency* encourages the use of small, independent, fast executing non blocking units of execution. The *agents* that compose an *agency* are executed according to a dependency list defined by a logical expression.  
