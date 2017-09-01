'use strict'
var domainInstances = {};
module.exports = function(io) {
    return {
        domain: function(domainName) {
            /**
             * Returns the instance of the Domain with name domainName.
             * If it doesn't exist, creates and returns a new Domain object.
             * @param {string} domainName - the name of the domain
             **/
            var instance = null;
            if (domainName in domainInstances) {
                instance = domainInstances[domainName]
            } else if (io) {
                instance = _createDomain(io, domainName);
                domainInstances[domainName] = instance;
            }
            return instance;
        },
        deleteDomain: function(domainName) {
            /**
             * Deletes the instance of the Domain with name domainName.
             * @param {string} domainName - the name of the domain
             **/            
            var dom = domainInstances[domainName];
            if (dom) {
                dom.empty();
                delete domainInstances[domainName];
            }
        }
    }
}


function _createDomain(io, domainName) {

    var ids = [];

    return {
        add: add,
        empty: empty,
        remove: remove,
        removeById: removeById,
        send: send,
        broadcast: broadcast,
        emitToDifference : emitToDifference,
        emitToIntersection : emitToIntersection,
        emitToUnion : emitToUnion
    }

    /**
     * Adds the provided Socket object to this domain, and makes it addressable
     * via id
     * @param {string} id - The id of the socket to add. Note that multiple
     * sockets can be added with the same id.
     * @param {Socket} socket - The socket to add to this domain.
     * @return null.
     */
    function add(id, socket) {
        socket.join(domainName + ':' + id);
        if (ids.indexOf(id) === -1) {
            ids.push(id);
        }
    }

    /**
     * Removes all sockets from this domain.
     * @param {string} id - The id of the socket to remove (given when adding)
     * @return null.
     */
    function empty() {
        
        var sockets = Object.keys(io.sockets.connected)
            .map(id => io.sockets.connected[id]);
            
        sockets.forEach(function(s) {
            ids.forEach(function(id) {
                s.leave(domainName + ':' + id);
            });
        });
        
        ids = [];
    }

    /**
     * Removes the socket(s) with provided id from this domain.
     * @param {string} id - The id of the socket to remove (given when adding)
     * @return null.
     */
    function removeById(id) {
        if (ids.indexOf(id) === -1){
            return;
        }
        
        var roomId = domainName + ':' + id;
        var sockets = Object.keys(io.sockets.connected)
            .map(_id => io.sockets.connected[_id]);
        sockets.forEach(function(s) {
            s.leave(roomId);
        });
        ids.splice(ids.indexOf(id), 1);
    }


    /**
     * Removes the provided Socket object from this domain.
     * @param {Socket} s - The socket to remove from this domain.
     * @return null.
     */
    function remove(s) {
        if (typeof s === 'string'){
            return removeById(s);
        }
        ids.forEach(function(id) {
            s.leave(domainName + ':' + id);
        })
    }


    /**
     * Emits provided event and data once to each socket in this domain.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} data - The object containing data to emit.
     * @return null.
     */
    function broadcast(eventName, data) {
        ids.forEach(id => send(id, eventName, data));
    }


    /**
     * Emits provided event and data to the socket with given id in this domain.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} data - The object containing data to emit.
     * @return null.
     */
    function send(id, eventName, data) {
        io.to(domainName + ':' + id).emit(eventName, data);
    }


    /**
     * Emits provided event and data once to each unique socket that is
     * in this domain and otherDomain.
     * @param {Domain} otherDomain - The other Domain.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} data - The object containing data to emit.
     * @return null.
     */
    function emitToUnion(otherDomain, eventName, data) {
        var otherDomainIds = otherDomain._getIds();
        var idSet = {};
        ids.concat(otherDomainIds).forEach(function(id) {
            idSet[id] = true;
        })
        for (var id in idSet) {
            send(id, eventName, data);
        }
    }

    /**
     * Emits provided event and data once to each socket that is both
     * in this domain as well as otherDomain.
     * @param {Domain or [string]} other - The other Domain. Alternatively, you
     * can pass in a string array of ids.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} data - The object containing data to emit.
     * @return null.
     */
    function emitToIntersection(other, eventName, data) {
        var otherDomainIds = [];
        if (other.hasOwnProperty('_getIds')) {
            otherDomainIds = other._getIds();
        } else if (Array.isArray(other)) {
            otherDomainIds = other;
        }
        var idSet = {};
        var otherIdSet = {};
        otherDomainIds.forEach(function(id) {
            otherIdSet[id] = true;
        })
        ids.forEach(function(id) {
            if (id in otherIdSet) {
                idSet[id] = true;
            }
        })
        for (var id in idSet) {
            send(id, eventName, data);
        }
    }
    
    /**
     * Emits provided event and data once to each socket that is in this domain
     * but not in other
     * @param {Domain or [string]} other - The other Domain. Alternatively, you
     * can pass in a string array of ids to exclude.
     * @param {string} eventName - The name of the event to emit.
     * @param {object} data - The object containing data to emit.
     * @return null.
     */
    function emitToDifference(other, eventName, data) {
        var otherDomainIds = [];
        if (other.hasOwnProperty(_getIds())){
            otherDomainIds = other._getIds();
        } else if (Array.isArray(other)){
            otherDomainIds = other;
        }
        
        ids.forEach(function(id){
            if (otherDomainIds.indexOf(id) === -1){
                send(id, eventName, data);
            }
        })
    }

    /**
     * Returns the given ids of the contained sockets. These are the ids
     * provided while adding sockets, not the ids of the sockets themselves
     * @return [string].
     */
    function _getIds() {
        return ids;
    }

}
