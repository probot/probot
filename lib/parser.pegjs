start = behavior

behavior = on:on ws then:then { return {on: on, then: then}; }

// Character Classes

word = letters:[a-zA-Z0-9_]+ { return letters.join(''); }

dot = "."
comma = ","
ws = [ \t\n\r]*

// on

on = "on" ws events:events { return events; }

events
  = event:event ws comma ws events:events { return [event].concat(events); }
  / event:event { return [event] }

event
  = e:eventName dot a:eventAction { return {name: e, action: a}; }
  / e:eventName { return {name: e}; }

eventName = word
eventAction = word

// then

then
  = "then" ws a:actions { return a; }

actions
  = action:action ws "and" ws actions:actions { return [action].concat(actions); }
  / action:action { return [action]; }

action
  = w:word { return {name: w}; }
