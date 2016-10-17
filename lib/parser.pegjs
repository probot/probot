start = behavior

behavior = on:on ws then:then { return {on: on, then: then}; }

// Character Classes

word = letters:[a-zA-Z0-9_]+ { return letters.join(''); }
dot = "."
comma = ","
and = "and"
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
  = "then" ws actions:actions { return actions; }

actions
  = action:action ws and ws actions:actions { return [action].concat(actions); }
  / action:action { return [action]; }

action
  = name:word "(" ws value:arguments ws ")" { return {name: name, value: value}; }
  / name:word { return {name: name}; }

arguments
  = arg:argument ws comma ws args:arguments { return [arg].concat(args) }
  / arg:argument { return arg; }

argument = word / string

// Strings

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape
  = "\\"

quotation_mark
  = '"'

unescaped
  = [^\0-\x1F\x22\x5C]

HEXDIG = [0-9a-f]i
