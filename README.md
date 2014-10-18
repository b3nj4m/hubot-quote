### hubot-quote

Remember things people have recently said, and quote them back later.

```
Alice: pizza is delicious!
Bob: I guess so.
Mallory: pizza is pretty delicious
Eve: hubot remember alice pizza
Hubot: remembering Alice: pizza is delicious!
Eve: hubot quote alice
Hubot: Alice: pizza is delicious!
```

### Matching

It currently uses [natural](https://github.com/NaturalNode/natural)'s `PorterStemmer` to match words regardless of conjugation, tense, etc. This is almost certainly going to change as I experiment with it more.

### Configuration:

- `HUBOT_QUOTE_CACHE_SIZE=N` - Cache the last `N` messages for each user for potential remembrance (default 25).

- `HUBOT_QUOTE_STORE_SIZE=N` - Remember at most `N` messages for each user (default 100).

### Commands:

- hubot remember \<user\> \<text\> - remember most recent message from \<user\> containing \<text\>

- hubot forget \<user\> \<text\> - forget most recent remembered message from <user> containing \<text\>

- hubot quote \<user\> [\<text\>] - quote a random remembered message from \<user\> containing \<text\>

- hubot quotemash [\<user\>] [\<text\>] - quote some random remembered messages that are from \<user\> and/or contain \<text\>

- hubot \<text\>|\<user\>mash - quote some random remembered messages that from \<user\> or contain \<text\>

