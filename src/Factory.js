const Bot = require('./Bot');
const { isInteger, isFunction, isEmpty, isNull, isUndefined } = require('lodash');

function validateString(it, message = 'Invalid parameter') {
    if (isEmpty(it)) {
        throw new Error(message);
    }
}

function validateFunction(it, message = 'Invalid function') {
    if (!isFunction(it)) {
        throw new Error(message);
    }
}

function validatePositiveInteger(it, message = 'Invalid number') {
    if (!isInteger(it) || it <= 0) {
        throw new Error(message);
    }
}

module.exports = class Factory {
    /**
     * Set the credentials use to connect
     *
     * @param {String} username - server query name for login
     * @param {String} password - server query password for login
     * @param {String} botName - name for bot to use after connect
     * @returns {Factory}
     */
    withCredentials(username, password, botName) {
        validateString(username, 'Invalid username');
        validateString(password, 'Invalid password');
        validateString(botName, 'Invalid bot name');

        this._credentials = { username, password, botName };
        return this;
    }

    /**
     * Set the actions to run on auth success/fail
     *
     * @param {Function} success - the function to run after validated
     * @param {Function} noPerms - the function to run if no valid groups
     * @returns {Factory}
     */
    withActions(success, noPerms) {
        validateFunction(success, 'Invalid success function');
        validateFunction(noPerms, 'Invalid noPerms function');

        this._actions = { success, noPerms };
        return this;
    }

    /**
     * Set where to connect to
     *
     * @param {String} address - the address of the server to connect to
     * @param {int} queryPort - the port for server query
     * @param {int} serverPort - the virtual server port
     * @returns {Factory}
     */
    withConnectionInfo(address, queryPort, serverPort) {
        validateString(address, 'Invalid address');
        validatePositiveInteger(queryPort, 'Invalid query port');
        validatePositiveInteger(serverPort, 'Invalid server port');

        this._connectionInfo = { address, queryPort, serverPort };
        return this;
    }

    /**
     * Set the channel ID to sit in and listen for joins
     *
     * @param {int} channelId - the channel to squat in
     * @returns {Factory}
     */
    inChannel(channelId) {
        validatePositiveInteger(channelId, 'Invalid channel id');

        this._channelId = channelId;
        return this;
    }

    /**
     * Set the server groups that are allowed to use the action by joining the channel, leave empty array for all groups
     * @param {String[]|int[]} groups - allowed groups
     * @returns {Factory}
     */
    withAllowedGroups(groups = []) {
        groups.forEach(it => validatePositiveInteger(it, 'Invalid group ID'));

        this._allowedGroupIds = groups;
        return this;
    }

    build() {
        if (!this._credentials) throw new Error('Missing credentials');
        if (!this._actions) throw new Error('Missing actions');
        if (!this._connectionInfo) throw new Error('Missing connection info');
        if (!this._channelId) throw new Error('Missing channel ID');
        if (!this._allowedGroupIds) throw new Error('Missing allowed groups');

        return new Bot(this._credentials, this._connectionInfo, this._channelId, this._actions, this._allowedGroupIds);
    }
}