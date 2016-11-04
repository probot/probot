{
  var unroll = options.util.makeUnroll(location, options)

  // Helper Functions

  function binaryExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        type: 'BinaryExpression',
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }
}

start = _* b:behavior* _* { return b; }

behavior
  = _* events:on _ conditions:if _ actions:then _* semicolon {
    return {
      type: 'behavior',
      events: events,
      conditions: conditions,
      actions: actions
    };
  }
  / _* events:on _ actions:then _* semicolon {
    return {
      type: 'behavior',
      events: events,
      actions: actions
    };
  }

// on

on = "on" _ head:event tail:(_ or _ event)* { return unroll(head, tail, 3); }

event
  = e:word dot a:word { return {type: 'event', name: e, action: a}; }
  / e:word { return {type: 'event', name: e}; }

// if

if = "if" _ conditions:RelationalExpression { return conditions; }

RelationalExpression
  = head:LogicalOrExpression tail:(_ RelationalOperator _ LogicalOrExpression)* {
    return binaryExpression(head, tail);
  }
RelationalOperator
  = "is not"
  / "is"
  / "does not contain"
  / "contains"
  / "does not match"
  / "matches"

LogicalOrExpression
  = head:LogicalAndExpression tail:(_ or _ LogicalAndExpression)* {
    return binaryExpression(head, tail);
  }

LogicalAndExpression
  = head:UnaryExpression tail:(_ and _ UnaryExpression)* {
    return binaryExpression(head, tail);
  }

UnaryExpression
  = operand
  / operator:UnaryOperator _ argument:UnaryExpression {
    return {
      type: 'UnaryExpression',
      operator: operator,
      argument: argument
    }
  }

UnaryOperator = "not"

operand = condition / attribute / string / boolean

condition
  = name:word "(" value:arguments ")" {
    return {type: 'condition', name: name, value: value};
  }

attribute = "@" head:word tail:(dot word)* {
  return {type: 'attribute', name: unroll(head, tail, 1)};
}

// then

then
  = "then" _ actions:actions { return actions; }

actions
  = action:action _ and _ actions:actions { return [action].concat(actions); }
  / action:action { return [action]; }

action
  = name:word "(" _* value:arguments _* ")" {
    return {type: 'action', name: name, value: value};
  }
  / name:word { return {type: 'action', name: name}; }

arguments
  = arg:argument _* comma _* args:arguments { return [arg].concat(args) }
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

// Character Classes

word = letters:[a-zA-Z0-9_]+ { return letters.join(''); }
dot = "."
comma = ","
semicolon = ";"
and = "and"
or = "or"
_ "whitespace" = ([ \t\n\r] / comment)+
comment = "#" (!LineTerminator .)*
LineTerminator = [\n\r\u2028\u2029]
