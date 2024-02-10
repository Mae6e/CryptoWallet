
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const Sentry = require('winston-transport-sentry-node').default;

const logLevels = process.env.LOG_LEVELS.split(',');

const options = {
    sentry: {
        dsn: 'https://a4c10ac7c36be094924a977c8aad78f2@o4505766415040512.ingest.sentry.io/4505766458097664',
    }
};

//? create loggerBase for each level
const createLoggerBase = (levelItem) => {

    //? config winston log
    return createLogger({
        format: format.combine(
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            format.errors({ stack: true }), //? save callstack when happen error
            format.printf((info) => { //? format of save data in log file
                const { timestamp, level, message, metaData, metaDataError, stack, pathFile } = info;
                return `[${timestamp}] [${level.toUpperCase()}] [${path.basename(pathFile)}] : ${message} ${!metaData ? '' : `- MetaData: ${JSON.stringify(metaData)}`} ${!metaDataError ? '' : `- MetaDataError: ${JSON.stringify(metaDataError)}`} ${!stack ? '' : `- Stack: ${stack}`}`;
            })
        ),
        statusLevels: true,
        transports: [
            levelItem ? new transports.File({ filename: 'logs/error.log', level: 'error' }) :
                new DailyRotateFile({
                    filename: `logs/%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    level: 'debug'
                }),
            new Sentry(options)
        ],
        exitOnError: false
    });
}

//? create logger
const loggerBase = createLoggerBase();

const errorLoggerBase = logLevels.includes('error') ? createLoggerBase('error') : null;


//? parseStack funcion: get line-fileName-functionName of error
const parseStack = (stackStr) => {
    try {
        if (!stackStr) return null;

        const lines = stackStr.split('\n');
        const [, errorMessage] = lines[0].split(': ');
        const stackLines = lines.slice(1);
        const firstLineParts = stackLines[0].match(/at (.+) \((.+):(\d+):\d+\)/);
        if (!firstLineParts) {
            return null;
        }
        return {
            errorMessage,
            functionName: firstLineParts[1],
            fileName: path.basename(firstLineParts[2]),
            lineNumber: parseInt(firstLineParts[3], 10),
        };
    } catch (e) {
        return null;
    }
}



//? get the file name from the module for save in log file
const logger = (module) => {
    const setLogData = (message, vars, stack) => {
        const pathFile = module.id
        const logResult = { message, pathFile, stack };
        if (vars) {
            logResult.metaData = vars
        }
        if (stack) {
            logResult.metaDataError = parseStack(stack);
        }
        return logResult;
    };

    return {
        //?information
        info: (message, vars) => {
            if (logLevels.includes('info')) {
                loggerBase.info(setLogData(message, vars));
            }
            else return;
        },
        //?debug
        debug: (message, vars) => {
            if (logLevels.includes('debug')) {
                loggerBase.debug(setLogData(message, vars));
            }
            else return;
        },
        //?error
        error: (message, vars, stack) => {
            if (logLevels.includes('error')) {
                errorLoggerBase.error(setLogData(message, vars, stack));
                loggerBase.error(setLogData(message, vars, stack));
            }
            else return;
        },
        //?warning
        warn: (message, vars) => {
            if (logLevels.includes('warn')) {
                loggerBase.warn(setLogData(message, vars));
            }
            else return;
        }
    }
};

module.exports = logger;