# domain.io

[Example app](https://github.com/neeilan/dio-example)

## Installation
Install using npm:
```
npm install domain.io
```
Include in your app by passing in the ```io``` object available in vanilla Node.js as well as Express.
```
var dio = require('domain.io')(io);
```

## API
The root object returned by  ``require('domain.io')(io)`` consists of two methods:

#### domain(String name) : Domain
Creates and returns a new domain with given name. If such a domain already exists, it returns the instance.

#### deleteDomain(String name)
Deletes the domain with the given name, if it exists.

The returned Domain objects have the following methods:
### Adding and removing
#### add(string id, Socket s)
Adds the provided Socket object to this domain, and makes it addressable via id. Note that **multiple sockets** - for instance, connections from all devices belonging to a particular user - can be added with the same id.

#### remove(Socket s)
Removes the provided Socket object from this domain.

#### remove(string id)
Removes the socket(s) with provided id from this domain.

### Sending messages
#### broadcast(string eventName, object data)
Emits provided event and data once to each socket in this domain.

#### empty()
Removes all sockets from this domain.

#### send(string id, string eventName, object data)
Emits provided event and data to the socket with given id in this domain.

#### emitToIntersection(Domain otherDomain, string eventName, object data)
Emits provided event and data once to each socket that is **both** in this domain as well as otherDomain.

#### emitToIntersection([string] ids, string eventName, object data)
Emits provided event and data once to each socket in this domain whose id is also contained in ids.

#### emitToDifference(Domain otherDomain, string eventName, object data)
Emits provided event and data once to each socket that is in this domain but not in otherDomain

#### emitToDifference([string] ids, string eventName, object data)
Emits provided event and data once to each socket that is in this domain but whose id is not in ids

#### emitToUnion(Domain otherDomain, string eventName, object data)
Emits provided event and data once to socket(s) with **unique** ids across this domain and otherDomain.

## Working with multiple modules
Working with Socket.io in an application with several modules can painful.
Domain.io maintains singleton instances of each domain, and domain(name) function returns the appropriate object if it already exists.
This is less error-prone than passing around Socket.io within app.locals.

To access Users from a different file, you can simply use. Access to the io object is only required to create a new domain.
```
var Users = require('domain.io)().domain('Users');
``` 

## Use cases
A good analogy for how domains relate to socket connections is how ORMs relate to databases. Your ORM model and a DIO domain working together can eliminate most context-switching between business logic and database/ws logic.

Suppose User 1 adds a new photo to the 'Sports' topic. We want to send a notification to:
1) All of User 1's followers
2) Everyone following 'Sports'
Since there can be users falling under both 1) and 2), there is a chance they receive two notifications if we simply emit to the relevant domains.
Instead, we can use ```emitToUnion```:
```
FollowersOf(user1Id).emitToUnion(Sports, 'photoUploadNotification', data)
```

On Twitter, a user gets notified if someone they follow replies to a tweet by someone else they follow. A situation like that is solvable by ```emitToIntersection```:
```
FollowersOf(user1Id).emitToIntersection(FollowersOf(user2id), 'replyNotification', data)
```

Data can be sent to all Users:
```
topics.sports.broadcast('msg', 'Hi sports fans!');
```
To specific users:
```
var firstName = getUserFirstName(userId);
Users.emit(userId, 'greeting', 'Hello there, ' + firstName);
```

Or to all interested users:
```
var followers = Followers(userId);
followers.emit(firstName + 'just signed in');
```
