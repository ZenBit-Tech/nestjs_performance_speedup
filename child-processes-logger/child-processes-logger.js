import { Logger } from '@nestjs/common';
const _logger = new Logger();
process.on('message', (msg) => {
    switch (msg.logLevel) {
        case 'log':
            _logger.log(msg.payload, msg.context);
            break;
        case 'error':
            _logger.error(msg.payload, msg.context);
            break;
        case 'warn':
            _logger.warn(msg.payload, msg.context);
            break;
        case 'debug':
            _logger.debug(msg.payload, msg.context);
            break;
        case 'verbose':
            _logger.verbose(msg.payload, msg.context);
            break;
    }
});
//# sourceMappingURL=child-processes-logger.js.map