# Grammar Definition

The grammar's design is based on [Gherkin](https://github.com/cucumber/cucumber/wiki/Gherkin).

## High-Level Design

* A script consists of zero or more blocks
* A block consists of a title and one or more statements
* There are two types of blocks: action and behavior
* Lines consisting only of whitespace are ignored

## Potential Features?

* Comments?
* Other types of blocks?
* Line continuation?

## EBNF

```
script = { block } ;

block = action-block |
        behavior-block ;

# Action Blocks
action-block = action-title, action-statement, { action-statement } ;

action-title = "Action:", op-white-space, description, end-of-line ;

description = non-white-space-char, [ { any-char }, non-white-space-char ] ;

action-statement = white-space, { any-char }, end-of-line ;

# Behavior blocks
behavior-block = behavior-title, [ schedule ], given-statement, [ when-list ], then-list ;

schedule = "every", white-space, interval, end-of-line ;

interval = "hour" |
           "day" |
           "week" |
           "month" |
           "year" ;

behavior-title = "Behavior:", op-white-space, description, end-of-line ;

given-statement = white-space, "given", white-space, description, end-of-line ;

when-list = when-statement, { when-statement | or-statement } ;

then-list = then-statement, { then-statement } ;

when-statement = white-space, "when", white-space, description, end-of-line ;

or-statement = white-space, "or", white-space, description, end-of-line ;

then-statement = white-space, "then", white-space, description, end-of-line ;

# White space
white-space = white-space-char, { white-space-char } ;
op-white-space = { white-space-char } ;
end-of-line = op-white-space, "\n" ;

# Character classes
white-space-char = ? Any whitespace character other than newline ? ;
non-white-space-char = ? Any non-whitespace character ? ;
any-char = ? Any character other than newline ? ;
```
