import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { LoggingInterceptor } from '@zozoboom/core/backend/interceptor';
import { fork } from 'child_process';
import * as _cluster from 'cluster';
import * as os from 'os';
import { resolve } from 'path';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
const cluster = _cluster as unknown as _cluster.Cluster;

/** Bootstrap configuration */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.useGlobalInterceptors(new LoggingInterceptor(fork(resolve('./child-processes-logger/child-processes-logger.js')), true, true));
  await app.listen(environment.http.port, '0.0.0.0');
}

/** Cluster configuration */
switch (environment.production) {
  case true:
    if (cluster.isMaster) {
      const cpuCount = os.cpus().length;
      for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
      }
      cluster.on('online', (worker) => {
        Logger.log('Worker ' + worker.process.pid + ' is online.');
      });
      cluster.on('exit', ({ process }) => {
        Logger.log('worker ' + process.pid + ' died.');
      });
    } else {
      bootstrap().then(() =>
        Logger.log(`Server started with cluster mode on port: ${environment.http.port}`, 'NestApplication')
      );
    }
    break;
  case false:
    bootstrap().then(() =>
      Logger.log(`Server started with single node on port: ${environment.http.port}`, 'NestApplication')
    );
    break;
}
