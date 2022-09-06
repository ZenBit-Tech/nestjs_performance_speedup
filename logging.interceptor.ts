import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { ExceptionErrorsEnumsValues } from '@zozoboom/core/common/enum';
import { ChildProcess } from 'child_process';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly _childLoggerProcess?: ChildProcess,
    private readonly _showInput: boolean = false,
    private readonly _showResponse: boolean = false
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const _requestStartTime = Date.now();
    const _contextType: 'rmq' | 'http' = context.getType() as 'rmq' | 'http';
    switch (_contextType) {
      case 'http':
        this._logHttpRequest(context, _requestStartTime, 'start');
        break;
      case 'rmq':
        this._logRMQRequest(context, _requestStartTime, 'start');
        break;
    }
    return next.handle().pipe(
      catchError((err) => {
        switch (_contextType) {
          case 'http':
            this._logHttpRequest(context, _requestStartTime, 'start', err);
            this._logHttpRequest(context, _requestStartTime, 'error', err);
            break;
          case 'rmq':
            this._logRMQRequest(context, _requestStartTime, 'start', err);
            this._logRMQRequest(context, _requestStartTime, 'error', err);
            break;
        }
        return throwError(() => err);
      }),
      tap((data) => {
        switch (_contextType) {
          case 'http':
            this._logHttpRequest(context, _requestStartTime, 'finish', data);
            break;
          case 'rmq':
            this._logRMQRequest(context, _requestStartTime, 'finish', data);
            break;
        }
      })
    );
  }

  private _logRMQRequest(
    context: ExecutionContext,
    requestStartTime: number,
    actionType: 'start' | 'finish' | 'error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputData: any = null
  ): void {
    const _handler = context.getHandler().name;
    const _logger = new Logger(`RMQ::${_handler}::${requestStartTime}`);
    const _requestString: string = JSON.stringify(context.getArgs()[0]) || context.getArgs()[0];

    switch (actionType) {
      case 'start':
        if (this?._childLoggerProcess) {
          const payload = this._showInput ? `[Start] => ${_requestString}` : `[Start]`;
          this._childLoggerProcess?.send({
            logLevel: 'log',
            context: `RMQ::${_handler}::${requestStartTime}`,
            payload,
          });
        } else {
          _logger.log(this._showInput ? `[Start] => ${_requestString}` : `[Start]`);
        }
        break;
      case 'finish':
        if (this?._childLoggerProcess) {
          const payload = this._showResponse
            ? `[Finish::${Date.now() - requestStartTime}ms] => ${JSON.stringify(outputData) || outputData}`
            : `[Finish::${Date.now() - requestStartTime}ms]`;
          this._childLoggerProcess?.send({
            logLevel: 'log',
            context: `RMQ::${_handler}::${requestStartTime}`,
            payload,
          });
        } else {
          _logger.log(
            this._showResponse
              ? `[Finish::${Date.now() - requestStartTime}ms] => ${JSON.stringify(outputData) || outputData}`
              : `[Finish::${Date.now() - requestStartTime}ms]`
          );
        }
        break;
      default:
        _logger.warn(`[Finish::${Date.now() - requestStartTime}ms] => ${outputData.message || outputData}`);
        break;
    }
  }

  private _logHttpRequest(
    context: ExecutionContext,
    requestStartTime: number,
    actionType: 'start' | 'finish' | 'error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputData: any = null
  ): void {
    const _handler = context.getHandler().name;
    const _logger = new Logger(`HTTP::${_handler}::${requestStartTime}`);
    const _request = context.switchToHttp().getRequest();
    const _requestQuery = _request.query;
    const _requestParams = _request.params;
    const _requestBody = _request.body;
    const _requestString: string = JSON.stringify({
      query: _requestQuery,
      params: _requestParams,
      body: _requestBody,
    });

    switch (actionType) {
      case 'start':
        if (this?._childLoggerProcess) {
          const payload = this._showInput ? `[Start] => ${_requestString}` : `[Start]`;
          this._childLoggerProcess?.send({
            logLevel: 'log',
            context: `HTTP::${_handler}::${requestStartTime}`,
            payload,
          });
        } else {
          _logger.log(this._showInput ? `[Start] => ${_requestString}` : `[Start]`);
        }
        break;
      case 'finish':
        if (this?._childLoggerProcess) {
          const payload = this._showResponse
            ? `[Finish::${Date.now() - requestStartTime}ms] => ${JSON.stringify(outputData) || outputData}`
            : `[Finish::${Date.now() - requestStartTime}ms]`;
          this._childLoggerProcess?.send({
            logLevel: 'log',
            context: `HTTP::${_handler}::${requestStartTime}`,
            payload,
          });
        } else {
          _logger.log(
            this._showResponse
              ? `[Finish::${Date.now() - requestStartTime}ms] => ${JSON.stringify(outputData) || outputData}`
              : `[Finish::${Date.now() - requestStartTime}ms]`
          );
        }
        break;
      default:
        if (outputData instanceof HttpException) {
          _logger.warn(
            `[Finish::${Date.now() - requestStartTime}ms] => ${JSON.stringify(outputData.getResponse()) || outputData}`
          );
        } else if (
          outputData instanceof Error &&
          Object.values<string>(ExceptionErrorsEnumsValues).indexOf(outputData.message) > -1
        ) {
          _logger.warn(`[Finish::${Date.now() - requestStartTime}ms] => ${outputData.message || outputData}`);
        } else {
          _logger.error(`[Finish::${Date.now() - requestStartTime}ms] => ${outputData.message || outputData}`);
        }
        break;
    }
  }
}
