const TeamSpeakClient = require('node-teamspeak');
const { intersection, isUndefined } = require('lodash');
const Promise = require('bluebird');

module.exports = class Bot {
    constructor(credentials, connectionInfo, channelId, actions, allowedGroupIds) {
        this._credentials = credentials;
        this._connectionInfo = connectionInfo;
        this._channelId = channelId;
        this._allowedGroupIds = allowedGroupIds;
        this._actions = actions;

        this._client = new TeamSpeakClient(this._connectionInfo.address, this._connectionInfo.queryPort);
        this._send = Promise.promisify(this._client.send, this._client);
        this.whoami = null;
    }

    /**
     * Send a login request to initalize connection
     *
     * @returns {Promise}
     * @private
     */
    _login() {
        return this._send('login', {
            client_login_name: this._credentials.username,
            client_login_password: this._credentials.password
        });
    }

    /**
     * Tell the client to use the server on the supplied port, required after login
     *
     * @returns {Promise}
     * @private
     */
    _useServer() {
        return this._send('use', { port: this._connectionInfo.serverPort });
    }

    /**
     * Register for channel events, required for events to trigger
     *
     * @returns {Promise}
     * @private
     */
    _notifyForEvents() {
        return this._send('servernotifyregister', { event: 'channel', id: this._channelId });
    }

    /**
     * Start connection to the server, runs login, selects a server, changes name and then registers for events
     *
     * @returns {Promise}
     * @private
     */
    _connect() {
        return this._login()
            .then(() => this._useServer())
            .then(() => this._changeName())
            .then(() => this._whoami())
            .then(() => this.joinChannel(this._channelId))
            .then(() => this._notifyForEvents());
    }

    _whoami() {
        return this._send('whoami', {})
            .then(response => {
                this.whoami = response;
            });
    }

    /**
     * Checks the given client id has one of the correct groups
     *
     * @private
     */
    _hasPermission(clid) {
        return this._send('clientinfo', { clid: clid }, ['groups'])
            .then(response => {
                // single group is returned as a number, multiple as comma separated string
                let groupIds = response.client_servergroups.toString().split(',');

                return this._allowedGroupIds.length == 0 || intersection(this._allowedGroupIds, groupIds).length > 0;
            });
    }


    /**
     * Listener. Fired on when clients are moved into/out of the registered channel. If the client was moved into our
     * channel we toggle their group and kick them
     *
     * @param {Object} moveEvent
     * @private
     */
    _onClientMove(moveEvent) {
        if(moveEvent.ctid !== this._channelId) return; // moved out of the channel

        const clientId = moveEvent.clid;

        if (clientId === this.whoami.client_id) return; // ourselves!

        this._hasPermission(clientId)
            .then(allowed => this._actions[allowed ? 'success' : 'noPerms'](this, clientId))
            .catch(err => console.error('Error when running for client ID', clientId, err));
    };

    /**
     * Listener. Fired when a client connects to the channel registered. Kicks the client on connection to the channel
     *
     * @param {Object} viewEvent
     * @private
     */
    _onEnterView(viewEvent) {
        if(viewEvent.ctid !== this._channelId) return; // not in this channel

        return this.kickClient(viewEvent.clid, 'Channel not allowed');
    };

    /**
     * Send a poke to the given client id
     *
     * @param clid
     * @param msg
     * @returns {Promise}
     */
    sendPoke(clid, msg) {
        return this._send('clientpoke', { clid, msg });
    }

    /**
     * Kick the client with the given id from the channel
     *
     * @param {Number} clid - the id of the client to kick
     * @param {String} message - the reason for kicking
     * @returns {Promise}
     */
    kickClient(clid, message) {
        return this._send('clientkick', { clid: clid, reasonid: 4, reasonmsg: message });
    }

    /**
     * Moves a client to the given channel id.
     *
     * @param {Number} cid - the id of the channel to move to
     * @param {Number} [clid] - the client id of the client to move, defaults to the bot itself
     * @param {String} [password] - the channel password if required
     */
    joinChannel(cid, clid = this.whoami.client_id, password) {
        const payload = { cid, clid };

        if (!isUndefined(password)) {
            payload.password = password;
        }

        return this._send('clientmove', payload);
    }

    /**
     * Send a private message to a client
     *
     * @param clid
     * @param message
     * @returns {Promise}
     */
    sendMessage(clid, message) {
        return this._send('sendtextmessage', {
            target: clid,
            targetmode: 1,
            msg: message
        });
    }

    /**
     * Switches the bot name to the configured one
     *
     * @returns {Promise}
     * @private
     */
    _changeName() {
        return this._send('clientupdate', { client_nickname: this._credentials.botName });
    }

    /**
     * Starts the conection up and starts listening/responding to events
     *
     * @returns {Promise} resolves after initial connection
     */
    start() {
        // register events
        this._client.on('clientmoved', this._onClientMove.bind(this));
        this._client.on('cliententerview', this._onEnterView.bind(this));

        return this._connect()
            // Run a keep alive
            .then(() => setInterval(() => this._send('whoami', {}).catch(err => console.error(err)), 60000));
    };
};