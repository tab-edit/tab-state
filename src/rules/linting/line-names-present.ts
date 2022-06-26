/*
 ensure that every tab block has line names using the resolved-line-name rule.
 Have config option that also allows user to lint to disallow implicit line names, or mixed
 explicit/implicit line names

 e.g.
 implicit line names:
 |---|---|
 |---|---|
 |---|---|
 |---|---|

 mixed implicit/explicit line names:

 e|---|---|     
 |---|---|
 G|---|---|
 |---|---|

 mixed line names should definitely be disallowed by default.
 
 */