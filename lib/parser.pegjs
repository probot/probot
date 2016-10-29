{
  var unroll = options.util.makeUnroll(location, options)
  var ast    = options.util.makeAST   (location, options)

  // Helper Functions

  function logicalExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        type: 'LogicalExpression',
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }

  function extractList(list, index) {
    return list.map(function(element) { return element[index]; });
  }

  function buildList(head, tail, index) {
    return [head].concat(extractList(tail, index));
  }
}

start = ws b:behavior* ws { return b; }

comment
  = "#" (!LineTerminator SourceCharacter)*

SourceCharacter
  = .

behavior
  = events:on conditions:if actions:then semicolon {
    return {
      type: 'behavior',
      events: events,
      conditions: conditions,
      actions: actions
    };
  }
  / events:on actions:then semicolon {
    return {
      type: 'behavior',
      events: events,
      actions: actions
    };
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
  = e:word dot a:word { return {type: 'event', name: e, action: a}; }
  / e:word { return {type: 'event', name: e}; }

// if

if = ws "if" ws conditions:RelationalExpression { return conditions; }

RelationalExpression
  = head:LogicalOrExpression tail:(ws RelationalOperator ws LogicalOrExpression)* {
    return logicalExpression(head, tail);
  }
RelationalOperator = "is not" / "is" / "contains" / "matches"

LogicalOrExpression
  = head:LogicalAndExpression tail:(ws or ws LogicalAndExpression)* {
    return logicalExpression(head, tail);
  }

LogicalAndExpression
  = head:operand tail:(ws and ws operand)* {
    return logicalExpression(head, tail);
  }

operand = condition / attribute / string / boolean

condition
  = name:word "(" value:arguments ")" {
    return {type: 'condition', name: name, value: value};
  }

attribute = "@" head:word tail:(dot word)* {
  return {type: 'attribute', name: buildList(head, tail, 1)};
}

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

boolean = true / false
true = "true" { return true; }
false = "false" { return false; }

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
