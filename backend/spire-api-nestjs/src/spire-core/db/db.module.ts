import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const cs = cfg.get<string>('DbAuth.ConnectionString')!;
        // parse “Host=...;Port=...;Database=...;Username=...;Password=...”
        const url = new URL(`postgres://${cs
          .replace(/ /g, '')
          .split(';')
          .filter(Boolean)
          .reduce((acc, kv) => {
            const [k, v] = kv.split('=');
            acc[k.toLowerCase()] = v;
            return acc;
          }, {} as Record<string, string>)
        .username}:${(cs.match(/Password=([^;]+)/i)?.[1])}@${(cs.match(/Host=([^;]+)/i)?.[1])}:${(cs.match(/Port=([^;]+)/i)?.[1])}/${(cs.match(/Database=([^;]+)/i)?.[1])}`);

        return {
          type: 'postgres',
          url: url.toString(),
          autoLoadEntities: true,
          synchronize: true, // dev only
        };
      },
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('DbDomain.ConnectionString'),
        dbName: cfg.get<string>('DbDomain.Database'),
      }),
    }),
  ],
})
export class DbModule {}
