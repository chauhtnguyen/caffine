import { Module } from '@nestjs/common';
import { DatabaseConfigService } from './service';
import { DatabaseConfigController } from './controller';

@Module({
  providers: [DatabaseConfigService],
  controllers: [DatabaseConfigController],
  exports: [DatabaseConfigService],
})
export class DatabaseConfigModule {}

export { DatabaseConfigService } from './service';
export { DatabaseConfigController } from './controller';
export * from './types';
