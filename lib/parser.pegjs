start = ws b:behavior* ws { return b; }

comment
  = "#" (!LineTerminator SourceCharacter)*

SourceCharacter
  = .

behavior
  = on:on cond:if then:then semicolon {
    return {type: 'behavior', on: on, conditions: cond, then: then};
  }
  / on:on then:then semicolon {
    return {type: 'behavior', on: on, then: then};
  }

// Character Classes

word = letters:[a-zA-Z0-9_]+ { return letters.join(''); }
dot = "."
comma = ","
semicolon = ";"
and = "and"
or = "or"
ws = ([ \t\n\r] / comment)*
LineTerminator = [\n\r\u2028\u2029]

// on

on = ws "on" ws events:events ws { return events; }

events
  = event:event ws or ws events:events { return [event].concat(events); }
  / event:event { return [event] }

event
  = e:eventName dot a:eventAction { return {type: 'event', name: e, action: a}; }
  / e:eventName { return {type: 'event', name: e}; }

eventName = word
eventAction = word

// if

if = ws "if" ws conditions:conditions { return conditions; }

conditions
  = condition:condition ws and ws conditions:conditions { return [condition].concat(conditions); }
  / condition:condition { return [condition]; }

condition
  = name:word "(" value:arguments ")" { return {name: name, value: value}; }

// then

then
  = ws "then" ws actions:actions ws { return actions; }

actions
  = action:action ws and ws actions:actions { return [action].concat(actions); }
  / action:action { return [action]; }

action
  = name:word "(" ws value:arguments ws ")" {
    return {type: 'action', name: name, value: value};
  }
  / name:word { return {type: 'action', name: name}; }

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
