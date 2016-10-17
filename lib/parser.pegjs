start = rule

rule = on

on = "on" ws events:events { return {on: events}; }

events
  = event:event ws comma ws events:events { return [event].concat(events); }
  / event:event { return [event] }

event
  = e:eventName dot a:action { return {name: e, action: a}; }
  / e:eventName { return {name: e}; }

eventName = word

action = word

word = letters:[a-zA-Z0-9_]+ { return letters.join(''); }

dot = "."
comma = ","
ws = [ \t\n\r]*
