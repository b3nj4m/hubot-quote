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

It currently matches first with [natural](https://github.com/NaturalNode/natural)'s `PorterStemmer` to match words regardless of conjugation, tense, etc. It then looks for substring matches as well.

### Configuration:

#### Cache size

Cache the last `N` messages for each user for potential remembrance (default 25).

```
HUBOT_QUOTE_CACHE_SIZE=N
```

#### Store size

Remember at most `N` messages for each user (default 100).

```
HUBOT_QUOTE_STORE_SIZE=N
```

#### Initialization timeout

Wait for N milliseconds for hubot to initialize and load brain data from redis. (default 10000)

```
HUBOT_QUOTE_INIT_TIMEOUT=N
```

### Commands:

#### Remember

Remember most recent message from `<user>` containing `<text>`.

```
hubot remember <user> <text>
```

#### Forget

Forget most recent remembered message from `<user>` containing `<text>`.

```
hubot forget <user> <text>
```

#### Quote

Quote a random remembered message that is from `<user>` and/or contains `<text>`.

```
hubot quote [<user>] [<text>]
```

#### Quotemash

Quote some random remembered messages that are from `<user>` and/or contain `<text>`.

```
hubot quotemash [<user>] [<text>]
```

#### Quotemash (alternate form)

Quote some random remembered messages that are from `<user>` or contain `<text>`.

```
hubot <text>|<user>mash
```
