
const AppError = require('../utils/appError');

class Response {
    constructor(statusCode, status, success, message, data) {
        this.statusCode = statusCode;
        this.status = status;
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(data) {
        return new Response(200, 'success', true, undefined, data);
    }

    static warn(message) {
        return new Response(400, 'fail', false, message, undefined);
    }

    static forbid(message) {
        return new Response(403, 'fail', false, message, undefined);
    }

    static error(statusCode, message) {
        return new Response(statusCode, 'error', false, message, undefined);
    }
}

module.exports = Response;